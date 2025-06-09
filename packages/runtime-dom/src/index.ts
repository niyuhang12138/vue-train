import { extend } from "@vue/shared";
import { nodeOps } from "./nodeOps";
import patchProp from "./patchProp";
import { createRenderer } from "@vue/runtime-core";
import type { Container, RenderOptions, VNode } from "@vue/runtime-core";

export type DomRenderOptions = RenderOptions<Node, Element>;

export * from "@vue/runtime-core";

export const domRenderOptions = extend(
    { patchProp },
    nodeOps
) as any as DomRenderOptions;

/**
 * render采用DOM API来进行渲染
 * @param vnode
 * @param container
 * @returns
 */
export const render = (vnode: VNode, container: Container) => {
    return createRenderer(domRenderOptions).render(vnode, container);
};
