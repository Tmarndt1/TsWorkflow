import { runScenario, scenarioNames, type Scenario } from "./scenarios.js";

async function main(): Promise<void> {
    const selected = process.argv[2] ?? "all";
    if (selected === "--help") {
        console.log(`Usage: npm start -- [all|${scenarioNames.join("|")}]`);
        return;
    }
    if (selected !== "all" && !scenarioNames.includes(selected as Scenario)) {
        throw new Error(`Unknown scenario "${selected}". Use --help to see available scenarios.`);
    }
    for (const scenario of selected === "all" ? scenarioNames : [selected as Scenario]) {
        await runScenario(scenario);
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
