const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("inspection reports actual outputs and omits skipped and failed steps", async () => {
    const { createCheckoutWorkflow } = await import('../dist/checkout.js');
    const { createDemoServices } = await import('../dist/services.js');
    for (const amount of [5000, 11000]) {
        const values = new Map();
        const workflow = createCheckoutWorkflow(createDemoServices(false, 1), 1000, (step, value) => values.set(step, value));
        const receipt = await workflow.run({id:'inspection', items:[{sku:'item', quantity:1, unitPriceCents:amount}]});
        assert.equal(values.has('discount'), amount >= 10000);
        assert.equal(values.get('validate').subtotalCents, amount);
        assert.equal(values.get('inventory').reservationId, receipt.reservationId);
        assert.equal(values.get('payment'), receipt.paymentId);
        assert.strictEqual(values.get('receipt'), receipt);
    }
    const outputs = [];
    const invalid = createCheckoutWorkflow(createDemoServices(), 1000, step => outputs.push(step));
    await assert.rejects(invalid.run({id:'invalid',items:[]}), {code:'INVALID_ORDER'});
    assert.deepEqual(outputs, []);
});

test("successful checkout applies the discount and pairs all step events", async () => {
    const { runScenario } = await import("../dist/scenarios.js");
    const { WorkflowStatus } = await import("ts-workflow");
    const lines = [];
    const result = await runScenario("success", line => lines.push(line));
    assert.equal(result.status, WorkflowStatus.Completed);
    assert.deepEqual(result.receipt, {
        orderId: "demo-success", subtotalCents: 11_000, discountCents: 1_100, totalCents: 9_900,
        reservationId: "reservation-demo-success", paymentId: "payment-demo-success"
    });
    const starts = result.events.filter(record => record.type === "started");
    const completions = result.events.filter(record => record.type === "completed");
    assert.deepEqual(starts.map(record => record.event.kind), ["sequential", "conditional", "parallel", "parallel", "final"]);
    assert.equal(completions.length, starts.length);
    for (const { event } of starts) {
        assert.equal(completions.filter(record => record.event.runId === event.runId && record.event.stepId === event.stepId).length, 1);
    }
    assert.equal(result.events.some(record => record.type === "failed"), false);
    assert.ok(lines.some(line => line.includes("Receipt:")));
});

for (const [scenario, code] of [["invalid", "INVALID_ORDER"], ["declined", "PAYMENT_DECLINED"], ["cancelled", "CANCELLED"], ["timeout", "TIMED_OUT"]]) {
    test(`${scenario} handles its expected error and emits failure events`, async () => {
        const { runScenario } = await import("../dist/scenarios.js");
        const { WorkflowStatus } = await import("ts-workflow");
        const result = await runScenario(scenario, () => {});
        assert.equal(result.status, WorkflowStatus.Faulted);
        assert.equal(result.error.code, code);
        assert.equal(result.receipt, undefined);
        assert.ok(result.events.some(record => record.type === "failed"));
        assert.equal(result.events.some(record => record.event.kind === "final"), false);
        const started = result.events.filter(record => record.type === "started");
        for (const { event } of started) {
            assert.equal(result.events.filter(record => record.type !== "started" && record.event.stepId === event.stepId).length, 1);
        }
        const eventCount = result.events.length;
        await new Promise(resolve => setTimeout(resolve, 80));
        assert.equal(result.events.length, eventCount, "late service settlement must not emit extra events");
        if (scenario === "timeout") {
            assert.equal(result.events.filter(record => record.type === "failed" && record.event.origin === "run").length, 2);
        }
    });
}

test("small orders skip the discount branch and run services concurrently", async () => {
    const { createCheckoutWorkflow } = await import("../dist/checkout.js");
    const observed = [];
    let releaseInventory;
    const services = {
        reserveInventory: order => { observed.push(["inventory", order.totalCents]); return new Promise(resolve => { releaseInventory = resolve; }); },
        authorizePayment: async order => { observed.push(["payment", order.totalCents]); releaseInventory("reservation"); return "payment"; }
    };
    const workflow = createCheckoutWorkflow(services);
    const events = [];
    const receipt = await workflow.run({ id: "small", items: [{ sku: "cable", quantity: 2, unitPriceCents: 500 }] }, {
        onStarted: event => { events.push(event); }
    });
    assert.equal(receipt.totalCents, 1_000);
    assert.equal(receipt.discountCents, 0);
    assert.deepEqual(observed, [["inventory", 1_000], ["payment", 1_000]]);
    assert.equal(events.some(event => event.kind === "conditional"), false);
});

test("invalid line items reject before external services are invoked", async () => {
    const { createCheckoutWorkflow } = await import("../dist/checkout.js");
    const services = {
        reserveInventory: async () => { assert.fail("inventory must not run"); },
        authorizePayment: async () => { assert.fail("payment must not run"); }
    };
    for (const item of [
        { sku: "x", quantity: 0, unitPriceCents: 1 },
        { sku: "x", quantity: 1.5, unitPriceCents: 1 },
        { sku: "x", quantity: 1, unitPriceCents: -1 },
        { sku: "x", quantity: 2, unitPriceCents: Number.MAX_SAFE_INTEGER }
    ]) {
        await assert.rejects(createCheckoutWorkflow(services).run({ id: "invalid", items: [item] }), { code: "INVALID_ORDER" });
    }
});

test("CLI supports help and rejects unknown scenarios", () => {
    const script = path.join(__dirname, "../dist/main.js");
    const help = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /Usage:/);
    const invalid = spawnSync(process.execPath, [script, "unknown"], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /Unknown scenario/);
});
