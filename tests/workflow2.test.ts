import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow2 } from "../examples/workflow2";

test('workflow1-test2', async () => {
    try {
        await new Workflow2().run(new CancellationTokenSource());
    } catch (error) {
        expect(error).toEqual("Workflow expired after 5000 ms")
    }
});