// Extend HTMLElement to include _vei and _vit
interface HTMLElement {
    removeEventListener(event_name: string, existingInvoker: any): unknown;
    addEventListener(
        event_name: string,
        invoker: { (e: Event): any; value: any }
    ): unknown;
    _vei?: any;
    _vit?: any;
}

function createInvoker(initialValue) {
    const invoker = (e) => invoker.value(e);
    invoker.value = initialValue;
    return invoker;
}

export const patchEvent = (
    el: HTMLElement,
    key: string,
    prevValue,
    nextValue
) => {
    // vue event invoker
    const invokers = el._vei || (el._vit = {});
    const event_name = key.slice(2).toLowerCase(); // onClick -> click
    const existingInvoker = invokers[event_name];

    if (nextValue && existingInvoker) {
        existingInvoker.value = nextValue;
    } else {
        if (nextValue) {
            // 如果有新的值
            const invoker = (invokers[event_name] = createInvoker(nextValue));
            el.addEventListener(event_name, invoker);
        } else {
            // 如果nextValue不存在，说明是删除事件
            el.removeEventListener(event_name, existingInvoker);
            invokers[event_name] = null;
        }
    }
};
