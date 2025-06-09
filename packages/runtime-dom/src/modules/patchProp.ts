export const excludedKeys = ["ref"];

export default function patchAttr(el: Element, key, value) {
    if (excludedKeys.includes(key)) return;
    if (value) {
        el.setAttribute(key, value);
    } else {
        el.removeAttribute(key);
    }
}
