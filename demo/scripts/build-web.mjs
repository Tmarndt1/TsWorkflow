import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('site/', root);
await mkdir(output, { recursive: true });
for (const [from, to] of [['prism.js', 'prism.js'], ['components/prism-typescript.min.js', 'prism-typescript.js']]) {
    await copyFile(new URL(`node_modules/prismjs/${from}`, root), new URL(to, output));
}
const sources = {};
for (const name of ['checkout.ts', 'services.ts', 'order.ts', 'browser.ts']) {
    sources[name] = await readFile(new URL(`src/${name}`, root), 'utf8');
}
await writeFile(new URL('sources.js', output), `export default ${JSON.stringify(sources)};\n`);
for (const name of ['index.html', 'style.css', 'code.css']) {
    await copyFile(new URL(`web/${name}`, root), new URL(name, output));
}
for (const name of ['browser.js', 'checkout.js', 'order.js', 'services.js']) {
    await copyFile(new URL(`dist/${name}`, root), new URL(name, output));
}
await copyFile(new URL('../dist/index.mjs', root), new URL('workflow.mjs', output));
console.log('Static website built in demo/site/');
