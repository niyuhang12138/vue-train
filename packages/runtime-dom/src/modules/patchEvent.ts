function createInvoker(value: any): any {
    const invoker = (e: any) => invoker.value(e);
    invoker.value = value;
    return invoker;
}

export function patchEvent(
    el: Element & {
        _vei?: Record<string, any>;
    },
    key: string,
    nextValue: Function
) {
    const eventName = key.slice(2).toLowerCase();

    const invokes = el._vei || (el._vei = {});

    const existingInvoker = invokes[eventName];

    if (nextValue && existingInvoker) {
        // update
        existingInvoker.value = nextValue;
        return;
    }

    if (nextValue) {
        const invoker = (invokes[eventName] = createInvoker(nextValue));
        el.addEventListener(eventName, invoker);
        return;
    }

    if (existingInvoker) {
        el.removeEventListener(eventName as any, existingInvoker as any);
        invokes[eventName] = void 0;
    }
}
