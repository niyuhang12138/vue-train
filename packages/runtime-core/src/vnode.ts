import {
    extend,
    isArray,
    isFunction,
    isObject,
    isString,
    ShapeFlags,
} from "@vue/shared";
import { Container, LifeCycle } from ".";
import { Reactive, RefImpl } from "@vue/reactivity";
import { isTeleport, Teleport, Transition } from "./components";

export type ParentComponent = Instance;

export interface Instance {
    data?: Reactive<any>;
    vNode: VNode;
    subTree?: VNode;
    isMounted: boolean;
    update?: () => void;
    props?: Record<string, any>;
    attrs?: Record<string, any>;
    slots?: Record<string, () => VNode>;
    propOptions?: Record<string, any>;
    proxy?: Instance;
    render?: () => VNode;
    next?: VNode;
    setupState?: Record<string, any>;
    exposed?: Record<string, any>;
    [LifeCycle.BEFORE_MOUNT]?: Array<() => void>;
    [LifeCycle.MOUNTED]?: Array<() => void>;
    [LifeCycle.BEFORE_UPDATE]?: Array<() => void>;
    [LifeCycle.UPDATED]?: Array<() => void>;
    [LifeCycle.UNMOUNTED]?: Array<() => void>;
    parent?: ParentComponent;
    provides: object;
    ctx: Record<string, any>;
}

export const Text = Symbol("text");
export const Fragment = Symbol("fragment");

export interface SetupContext {
    emit: (event: string, ...args: any[]) => void;
    attrs: Record<string, any>;
    slots: Record<string, any>;
    expose: (exposed: Record<string, any>) => void;
}

export interface Component extends Object {
    data?: () => Record<string, any>;
    render: () => VNode;
    props?: Record<string, any>;
    setup?: (
        props: Record<string, any>,
        context: SetupContext
    ) => object | (() => VNode);
}

export type FunctionalComponent = (
    props: Record<string, any>,
    options: { slots: Record<string, () => VNode> }
) => VNode;

export type VNodeTypes =
    | string
    | typeof Text
    | typeof Fragment
    | Component
    | FunctionalComponent
    | Teleport;

export type VNodeChildrenArrayType = Array<VNode | string | number>;
export type VNodeChild = VNode | string | VNodeChildrenArrayType;

export interface VNode {
    __v_isVNode: true;
    type: VNodeTypes;
    props?: Record<string | symbol, any>;
    children?:
        | Array<VNode | string | number>
        | string
        | Record<string, () => VNode>;
    key?: string;
    shapeFlag: number;
    el?: Container;
    component?: Instance;
    ref?: RefImpl;
    target?: Container;
    transition?: Transition;
    patchFlag?: any;
    dynamicChildren?: Array<any>;
}

export function createVNode(
    type: VNodeTypes,
    props?:
        | VNode["props"]
        | {
              ref?: RefImpl;
              key?: string;
          },
    children?: VNode["children"],
    patchFlag?: number
) {
    const shapeFlag = isString(type)
        ? ShapeFlags.ELEMENT
        : isTeleport(type)
        ? ShapeFlags.TELEPORT
        : isObject(type)
        ? ShapeFlags.COMPONENT
        : isFunction(type)
        ? ShapeFlags.FUNCTIONAL_COMPONENT
        : 0;
    const vnode: VNode = {
        __v_isVNode: true,
        type,
        props,
        key: props?.key,
        shapeFlag,
        patchFlag,
    };

    if (currentBlock && patchFlag > 0) {
        currentBlock.push(vnode);
    }

    if (props?.ref) {
        vnode.ref = props.ref;
    }

    if (children) {
        if (isArray(children)) {
            vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
        } else if (isObject(children)) {
            vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN; // 插槽
        } else {
            children = String(children);
            vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
        }
        vnode.children = children;
    }

    return vnode;
}

export function isVNode(value: any): value is VNode {
    return value ? value.__v_isVNode === true : false;
}

export function isSameVNode(n1: VNode, n2: VNode): boolean {
    return n1.type === n2.type && n1.key === n2.key;
}

let currentBlock = null;
export function openBlock() {
    currentBlock = [];
}

export function closeBlock() {
    currentBlock = null;
}

export function setupBlock(vnode) {
    vnode.dynamicChildren = currentBlock;
    closeBlock();
    return vnode;
}

export function createElementBlock(type, props, children, patchFlag?) {
    const vnode = createVNode(type, props, children, patchFlag);
    if (currentBlock) {
        currentBlock.push(vnode);
    }

    return setupBlock(vnode);
}

export function toDisplayString(value: unknown): string {
    return isString(value)
        ? value
        : value === null
        ? ""
        : value instanceof Object
        ? JSON.stringify(value)
        : String(value);
}

export { createVNode as createElementVNode };
