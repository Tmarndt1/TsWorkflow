import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const root = new URL('../site/', import.meta.url);
const files = new Set(['index.html', 'style.css', 'code.css', 'prism.js', 'prism-typescript.js', 'sources.js', 'browser.js', 'checkout.js', 'order.js', 'services.js', 'workflow.mjs']);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript' };
const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!files.has(name)) { response.writeHead(404).end('Not found'); return; }
    try {
        const body = await readFile(new URL(name, root));
        response.writeHead(200, { 'Content-Type': `${types[name.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-store' });
        response.end(body);
    } catch {
        response.writeHead(500).end('Build the website first with npm run build:web.');
    }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(4173, '127.0.0.1', () => console.log('Workflow demo: http://127.0.0.1:4173'));
