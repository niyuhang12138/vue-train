import { isString, ShapeFlags } from "@vue/shared";

export interface VNode {
    __v_isVNode: boolean; // 标识是虚拟节点
    type: string; // 节点类型
    props: Record<string, any> | null; // 节点属性
    children: any; // 子节点
    shapeFlag: number; // 节点类型标识
    key: string | number | null; // 唯一标识
    el: any; // 真实节点
}

export function isVNode(value: any): boolean {
    return !!(value && value.__v_isVNode);
}

export function isSameVNode(n1: VNode, n2: VNode): boolean {
    return n1.type === n2.type && n1.key === n2.key;
}

export function createVNode(
    type: string,
    props = null,
    children = null
): VNode {
    // 组件
    // 元素
    // 文本
    // 自定义的keep-alive

    // 用标识来区分 对应的虚拟节点类型， 这个表示采用的是位运算的方式 可以方便组合
    const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;

    // 虚拟节点要对应真实节点
    const vnode: VNode = {
        __v_isVNode: true, // 标识是虚拟节点
        type,
        props,
        children,
        shapeFlag, // 节点类型
        key: props?.key,
        el: null, // 真实节点
    };

    if (children) {
        let type = 0;
        if (Array.isArray(children)) {
            type = ShapeFlags.ARRAY_CHILDREN; // 数组
        } else {
            type = ShapeFlags.TEXT_CHILDREN; // 文本
        }
        vnode.shapeFlag |= type;
    }

    return vnode;
}
