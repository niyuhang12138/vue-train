export const patchStyle = (
    el: HTMLElement,
    prev: CSSStyleDeclaration | null,
    next: CSSStyleDeclaration | null
) => {
    if (next) {
        const style = el.style;

        for (const key in next) {
            style[key] = next[key];
        }

        for (const key in prev) {
            if (next[key] == null) {
                // 如果新值没有这个属性
                style[key] = null; // 删除这个属性
            }
        }
    } else {
        el.removeAttribute("style");
    }
};
