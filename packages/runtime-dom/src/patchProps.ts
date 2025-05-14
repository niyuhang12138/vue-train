import { patchAttr } from "./modules/attr";
import { patchClass } from "./modules/class";
import { patchEvent } from "./modules/event";
import { patchStyle } from "./modules/style";

export const patchProp = (
    el: HTMLElement,
    key: string,
    prevValue,
    nextValue
) => {
    // class / style / on / attr
    if (key === "class") {
        patchClass(el, nextValue);
    } else if (key === "style") {
        patchStyle(el, prevValue, nextValue);
    } else if (/^on[^a-z]/.test(key)) {
        // 事件的处理
        patchEvent(el, key, prevValue, nextValue);
    } else {
        // attr
        patchAttr(el, key, nextValue);
    }
};
