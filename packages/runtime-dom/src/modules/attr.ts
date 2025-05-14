export const patchAttr = (el: HTMLElement, key: string, value: string) => {
    if (value === null) {
        // 如果没有值了，删除属性
        el.removeAttribute(key);
    } else {
        // 如果有值了，设置属性
        el.setAttribute(key, value);
    }
};
