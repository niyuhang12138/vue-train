// 主要是对属性的增删改查

import { DomRenderOptions } from ".";
import patchClass from "./modules/patchClass";
import { patchEvent } from "./modules/patchEvent";
import patchAttr from "./modules/patchProp";
import patchStyle from "./modules/patchStyle";

const patchProps: DomRenderOptions["patchProp"] = (
    el,
    key,
    prevValue,
    nextValue
) => {
    if (key === "class") patchClass(el, nextValue);
    else if (key === "style") patchStyle(el, prevValue, nextValue);
    else if (/^on[^a-z]/.test(key)) return patchEvent(el, key, nextValue);
    else return patchAttr(el, key, nextValue);
};

export default patchProps;
