# @justcoding123/signals

A signals library that does nothing too fancy.

# Usage

```ts
import { Signal } from "@justcoding123/signals";

const [count, setCount] = Signal.createSignal(0);
const doubled = Signal.createMemo(() => count() * 2);

Signal.createEffect(({ defer }) => {
    console.log(`The count is: ${count()}`);
    defer(() => console.log("This gets called when effect is rerun, for cleaning up event listeners/etc..."));
});

setInterval(() => setCount(count() + 1), 500);
```