class EventEmitter<T extends Record<string, any[]> = {}> {
    private events: Record<string, ((...args: any) => void)[]> = {};

    on<U extends keyof T & string>(
        event: U,
        callback: (...args: T[U]) => void
    ) {
        if (!(event in this.events)) this.events[event] = [];
        this.events[event].push(callback);
    }

    protected emit<U extends keyof T & string>(event: U, ...args: T[U]) {
        if (event in this.events)
            for (const callback of this.events[event]) callback(...args);
    }
}

type SignalMarker = () => void;

let currentSignal: SignalMarker | null = null;

export namespace Signal {
    export type Setter<T> = (value: SignalValue<T>) => void;
    export type Accessor<T> = () => T;
    export type AnySignal<T = any> = Computed<T> | State<T>;

    type SignalValue<T> = T | ((previous: T) => T);
    type SignalEvents<T extends AnySignal> = { change: [signal: T] };

    export class State<T> extends EventEmitter<SignalEvents<State<T>>> {
        private dependents: SignalMarker[] = [];

        constructor(private value: T) {
            super();
        }

        get() {
            if (currentSignal) this.dependents.push(currentSignal);

            return this.value;
        }

        set(newValue: SignalValue<T>) {
            let value: T;

            if (typeof newValue === "function")
                value = (newValue as any)(this.value);
            else value = newValue;

            if (this.value !== value) {
                this.value = value;

                this.emit("change", this);
                for (const dep of this.dependents) dep();
            }
        }
    }

    export class Computed<T> extends EventEmitter<SignalEvents<Computed<T>>> {
        private value: T;
        private isMarked: boolean = false;
        private dependents: SignalMarker[] = [];

        constructor(private compute: () => T) {
            super();

            if (currentSignal)
                throw new Error("cannot create a signal inside another signal");

            currentSignal = () => this.mark();
            this.value = compute();
            currentSignal = null;
        }

        private mark() {
            this.isMarked = true;
            this.emit("change", this);

            for (const dep of this.dependents) dep();
        }

        get() {
            if (currentSignal) this.dependents.push(currentSignal);

            if (this.isMarked) {
                this.value = this.compute();
                this.isMarked = false;
            }

            return this.value;
        }
    }

    export function createEffect(
        compute: (ctx: { defer: (callback: () => void) => void }) => void
    ) {
        let cleanup: (() => void)[] = [];
        const ctx = { defer: (cb: () => void) => cleanup.push(cb) };
        const comp = new Signal.Computed(() => compute(ctx));

        comp.on("change", () => {
            for (const cb of cleanup) cb();
            cleanup = [];

            comp.get();
        });
    }

    export function createSignal<T>(
        value: T
    ): [Signal.State<T>["get"], Signal.State<T>["set"]] {
        const sig = new Signal.State(value);
        return [sig.get.bind(sig), sig.set.bind(sig)];
    }

    export function createMemo<T>(value: () => T): Signal.Computed<T>["get"] {
        const sig = new Signal.Computed(value);
        return () => sig.get();
    }

    export function untracked<T>(callback: () => T): T {
        const lastSignal = currentSignal;
        let value: T;

        currentSignal = null;
        value = callback();
        currentSignal = lastSignal;

        return value;
    }
}
