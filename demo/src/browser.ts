import { CancellationTokenSource, type WorkflowStepStartedEvent, type WorkflowStepCompletedEvent, type WorkflowStepFailedEvent } from 'ts-workflow';
import { createCheckoutWorkflow } from './checkout.js';
import { createDemoServices } from './services.js';
import sources from './sources.js';

declare const Prism: {
    languages: { typescript: unknown };
    highlight(code: string, grammar: unknown, language: string): string;
};
function highlight(code: string): string {
    // Prism escapes the source before producing syntax spans.
    return Prism.highlight(code, Prism.languages.typescript, 'typescript');
}

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = element<HTMLFormElement>('configuration');
const settings = element<HTMLFieldSetElement>('settings');
const run = element<HTMLButtonElement>('run');
const cancel = element<HTMLButtonElement>('cancel');
const status = element('status');
const result = element('result');
const events = element<HTMLOListElement>('events');
const steps = ['validate', 'discount', 'inventory', 'payment', 'receipt'];
let source: CancellationTokenSource | undefined;
const sourceDialog = element<HTMLDialogElement>('source-dialog');
const sourceFile = element<HTMLSelectElement>('source-file');
const sourceText = element('source-text');
function displaySource() {
    const text = sources[sourceFile.value] ?? 'Source unavailable. Rebuild the demo.';
    sourceText.innerHTML = highlight(text);
    element('source-lines').textContent = text.trimEnd().split('\n').map((_, index) => index + 1).join('\n');
    sourceText.closest('.source-frame')!.scrollTop = 0;
    sourceText.closest('.source-frame')!.scrollLeft = 0;
}
function openSource(file: string) {
    sourceFile.value = file;
    displaySource();
    sourceDialog.showModal();
}
sourceFile.addEventListener('change', displaySource);
element('view-source').addEventListener('click', () => openSource('checkout.ts'));
element('close-source').addEventListener('click', () => sourceDialog.close());

// Excerpts from checkout.ts; service calls await the simulated service implementations.
const code: Record<string, string[]> = {
    validate: ['const pricedOrder = priceOrder(order);', 'return pricedOrder;'],
    discount: ['// Runs only if subtotalCents >= 10_000', 'const discountCents = Math.round(order.subtotalCents * 0.1);', 'return { ...order, discountCents,', '  totalCents: order.subtotalCents - discountCents };'],
    inventory: ['const reservationId = await', '  services.reserveInventory(order, token);', 'return { order, reservationId };'],
    payment: ['const paymentId = await', '  services.authorizePayment(order, token);', 'return paymentId;'],
    receipt: ['return {', '  orderId: reservation.order.id,', '  subtotalCents: reservation.order.subtotalCents,', '  discountCents: reservation.order.discountCents,', '  totalCents: reservation.order.totalCents,', '  reservationId: reservation.reservationId,', '  paymentId', '};']
};
for (const id of steps) {
    const inspector = document.createElement('div');
    inspector.className = 'inspector';
    const caption = document.createElement('p');
    caption.className = 'code-caption';
    caption.textContent = 'STEP CODE · excerpt';
    const viewSource = document.createElement('button');
    viewSource.type = 'button';
    viewSource.className = 'source-link';
    viewSource.textContent = 'View actual source';
    viewSource.setAttribute('aria-label', `View actual source for ${id}`);
    viewSource.addEventListener('click', () => openSource(id === 'inventory' || id === 'payment' ? 'services.ts' : 'checkout.ts'));
    const pre = document.createElement('pre');
    pre.className = 'step-code';
    const block = document.createElement('code');
    for (const [index, text] of code[id]!.entries()) {
        const line = document.createElement('span');
        line.className = 'code-line';
        line.dataset.line = String(index + 1);
        line.innerHTML = highlight(text);
        block.append(line);
    }
    pre.append(block);
    const output = document.createElement('pre');
    output.className = 'step-output';
    output.textContent = 'Result: waiting for execution';
    inspector.append(caption, viewSource, pre, output);
    element(id).append(inspector);
}

function showOutput(id: string, value: unknown) {
    element(id).querySelector('.step-output')!.textContent = `Returned value\n${JSON.stringify(value, null, 2)}`;
}

function setStep(id: string, state: string, label: string) {
    const card = element(id);
    card.dataset.state = state;
    card.querySelector('.state')!.textContent = label;
    const lines = [...card.querySelectorAll<HTMLElement>('.code-line')];
    for (const line of lines) line.classList.remove('executing', 'returned', 'error-line');
    if (state === 'running') {
        const active = id === 'inventory' || id === 'payment' ? lines.slice(0, 2) : lines;
        active.forEach(line => line.classList.add('executing'));
    }
    if (state === 'completed') lines.filter(line => line.textContent?.includes('return')).forEach(line => line.classList.add('returned'));
    if (state === 'failed') lines.forEach(line => line.classList.add('error-line'));
    if (state === 'waiting') card.querySelector('.step-output')!.textContent = 'Result: waiting for execution';
    if (state === 'skipped') card.querySelector('.step-output')!.textContent = label === 'Skipped' ? 'No result · condition was false; input passes through unchanged.' : 'No result · run ended before this step.';
}

cancel.addEventListener('click', () => {
    source?.cancel();
    cancel.disabled = true;
    status.textContent = 'Cancelling';
    result.textContent = 'Cancellation requested. Waiting for active services to check their tokens…';
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (source) return;
    const scenario = element<HTMLSelectElement>('scenario').value;
    const amount = Math.round(Number(element<HTMLInputElement>('amount').value) * 100);
    const delay = Number(element<HTMLSelectElement>('speed').value);
    const currentSource = new CancellationTokenSource();
    source = currentSource;
    settings.disabled = run.disabled = true;
    cancel.disabled = false;
    status.textContent = 'Running';
    result.textContent = 'Executing the workflow…';
    events.replaceChildren();
    element('event-count').textContent = '0 events';
    steps.forEach(id => setStep(id, 'waiting', 'Waiting'));
    if (amount < 10_000 && scenario !== 'invalid') setStep('discount', 'skipped', 'Skipped');
    const mapping = new Map<string, string>();
    let parallelIndex = 0;
    let count = 0;
    let cancellationTimer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    let acceptingOutputs = true;
    const workflow = createCheckoutWorkflow(createDemoServices(scenario === 'declined', delay), scenario === 'timeout' ? delay / 2 : 4_000,
        (id, value) => { if (acceptingOutputs) showOutput(id, value); }, delay);

    function observe(type: 'started' | 'completed' | 'failed', detail: WorkflowStepStartedEvent | WorkflowStepCompletedEvent | WorkflowStepFailedEvent) {
        if (type === 'started') {
            const id = detail.kind === 'sequential' ? 'validate' : detail.kind === 'conditional' ? 'discount' : detail.kind === 'final' ? 'receipt' : parallelIndex++ === 0 ? 'inventory' : 'payment';
            mapping.set(detail.stepId, id);
            element(id).scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'center',
                inline: 'nearest'
            });
            if (scenario === 'cancelled' && detail.kind === 'parallel' && cancellationTimer === undefined) {
                cancellationTimer = setTimeout(() => cancel.click(), delay / 3);
            }
        }
        const id = mapping.get(detail.stepId)!;
        setStep(id, type === 'started' ? 'running' : type, type === 'started' ? 'Running' : type === 'completed' ? 'Completed' : 'Failed');
        const line = document.createElement('li');
        line.dataset.type = type;
        const duration = 'durationMs' in detail ? ` · ${detail.durationMs.toFixed(1)} ms` : '';
        const failure = 'error' in detail ? ` · origin: ${detail.origin} · ${detail.error instanceof Error ? detail.error.message : String(detail.error)}` : '';
        if ('error' in detail) element(id).querySelector('.step-output')!.textContent = `${detail.origin === 'run' ? 'Run ended while this step was active' : 'Step threw an error'}\n${detail.error instanceof Error ? detail.error.message : String(detail.error)}\nNo returned value.`;
        line.textContent = `+${(performance.now() - started).toFixed(0)} ms · on${type[0]!.toUpperCase()}${type.slice(1)} · ${id} · ${detail.runId}/${detail.stepId}${duration}${failure}`;
        events.append(line);
        events.scrollTop = events.scrollHeight;
        element('event-count').textContent = `${++count} events`;
    }
    try {
        const receipt = await workflow.run({ id: 'web-order', items: scenario === 'invalid' ? [] : [{ sku: 'demo-order', quantity: 1, unitPriceCents: amount }] }, {
            cancellationTokenSource: currentSource,
            onStarted: detail => observe('started', detail),
            onCompleted: detail => observe('completed', detail),
            onFailed: detail => observe('failed', detail)
        });
        const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
        status.textContent = 'Completed';
        result.textContent = `Checkout complete · ${money(receipt.totalCents)}\nSubtotal ${money(receipt.subtotalCents)} − discount ${money(receipt.discountCents)}\n${receipt.reservationId} · ${receipt.paymentId}`;
    } catch (error) {
        status.textContent = 'Faulted';
        result.textContent = error instanceof Error ? error.message : String(error);
        for (const id of steps) if (element(id).dataset.state === 'waiting') setStep(id, 'skipped', 'Not reached');
    } finally {
        acceptingOutputs = false;
        clearTimeout(cancellationTimer);
        source = undefined;
        settings.disabled = run.disabled = false;
        cancel.disabled = true;
    }
});
