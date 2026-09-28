const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

async function main() {
    const formats = [
        ["CommonJS", require("../dist/index.js")],
        ["ESM", await import("../dist/index.mjs")]
    ];

    for (const [format, api] of formats) {
        class Example extends api.Workflow {
            build(builder) {
                return builder
                    .startWith(() => ({ run: async input => input + 1 }))
                    .parallel([
                        () => ({ run: async input => String(input) }),
                        () => ({ run: async input => input * 2 })
                    ])
                    .if(result => result[1] > 0)
                        .do(() => ({ run: async result => result.join(":") }))
                    .endIf()
                    .endWith(() => ({ run: async result => result }));
            }
        }

        const workflow = new Example();
        assert.equal(await workflow.run(2), "3:6");
        assert.equal(workflow.status, api.WorkflowStatus.Completed);

        const defined = api.defineWorkflow(builder => builder
            .startWith(() => ({ run: input => input + 1 })).timeout(100)
            .if(input => input > 0).do(() => ({ run: input => String(input) }))
            .else().stop().endIf()
            .endWith(() => ({ run: text => text.toUpperCase() })).expire(1_000));
        assert.equal(await defined.run(2), "3");
        const source = new api.CancellationTokenSource();
        source.cancel();
        await assert.rejects(defined.run(2, source), error =>
            error instanceof api.WorkflowError && error.code === api.WorkflowErrorCode.Cancelled);
        await assert.rejects(defined.run(-2), error =>
            error instanceof api.WorkflowError && error.code === api.WorkflowErrorCode.Stopped);
        console.log(format + " package check passed");
    }

    // Compile public consumer tests against the generated declarations, not src.
    const roots = [];
    for (const [extension, entry] of [["ts", "./index.js"], ["mts", "./index.mjs"]]) {
        for (const test of ["PublicApi", "Workflow"]) {
            const source = fs.readFileSync(path.join(__dirname, `../tests/types/${test}.types.ts`), "utf8")
                .replaceAll('"../../index"', JSON.stringify(entry));
            const file = path.join(__dirname, `../dist/${test}.consumer.${extension}`);
            fs.writeFileSync(file, source);
            roots.push(file);
        }
    }
    const program = ts.createProgram(roots, {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        types: ["node"]
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) {
        throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCanonicalFileName: file => file,
            getCurrentDirectory: () => process.cwd(),
            getNewLine: () => "\n"
        }));
    }
    console.log("CommonJS and ESM declarations pass strict consumer type checks");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
