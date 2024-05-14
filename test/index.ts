import { Signal } from "../src";

const button = document.querySelector("button")!;
const display = document.querySelector("#display1")!;
const display2 = document.querySelector("#display2")!;

const [count, setCount] = Signal.createSignal(0);
const doubled = Signal.createMemo(() => count() * 2);

Signal.createEffect(() => {
    display.textContent = `Count is: ${count()}`;
});

Signal.createEffect(() => {
    display2.textContent = `Count doubled is: ${doubled()}`;
});

button.addEventListener("click", () => setCount(count() + 1));
