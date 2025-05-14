export const patchClass = (el: Element, value: string | null) => {
    if (value === null) {
        // 如果没有类型 就移除
        el.removeAttribute("class");
    } else {
        el.setAttribute("class", value);
    }
};
