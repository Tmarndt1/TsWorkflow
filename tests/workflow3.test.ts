import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow3 } from "../examples/workflow3";

test('workflow1-test3', async () => {
    try {
        await new Workflow3().run(new CancellationTokenSource());
    } catch (error) {
        expect(error).toEqual("Workflow expired after 500 ms")
    }
});