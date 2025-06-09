import { isArray, isObject } from "@vue/shared";
import { createVNode, isVNode } from "./vnode";

export function h(type: any, propsOrChildren?: any, children?: any) {
    let l = arguments.length;

    if (l === 2) {
        if (isVNode(propsOrChildren)) {
            return createVNode(type, null, [propsOrChildren]);
        } else if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            return createVNode(type, propsOrChildren);
        } else {
            return createVNode(type, null, propsOrChildren);
        }
    } else {
        if (l > 3) {
            children = Array.from(arguments).slice(2);
        }
        if (l === 3 && isVNode(children)) {
            children = [children];
        }

        return createVNode(type, propsOrChildren, children);
    }
}
