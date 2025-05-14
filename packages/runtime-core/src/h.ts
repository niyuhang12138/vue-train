import { isObject } from "@vue/shared";
import { createVNode, isVNode } from "./vnode";

// 提供多样的api， 根据参数区分
export function h(type, propsOrChildren?, children?) {
    const l = arguments.length;

    // h(type, {}) h(type, h('span')) / h(type, 'text) h(type, [])
    if (l === 2) {
        if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
            return createVNode(type, propsOrChildren);
        } else {
            return createVNode(type, null, propsOrChildren);
        }
    } else {
        if (l > 3) {
            // h('div', {}, 'a', 'b')  这样操作的第二个参数必须是属性
            children = Array.from(arguments).slice(2);
        } else if (l === 3 && isVNode(children)) {
            // h('div', {}, h('span'))  这样操作的第二个参数必须是属性
            children = [children];
        }

        return createVNode(type, propsOrChildren, children);
    }
}
