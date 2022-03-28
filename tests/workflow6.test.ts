import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow6 } from "../examples/workflow6";

test('workflow1-test6', async () => {
    expect(await new Workflow6().run(new CancellationTokenSource()))
        .toEqual("Captured: Workflow error in step 1");
});