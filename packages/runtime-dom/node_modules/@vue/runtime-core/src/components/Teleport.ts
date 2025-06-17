import { ShapeFlags } from "@vue/shared";
import { Container } from "../renderer";
import { ParentComponent, VNode, VNodeChildrenArrayType } from "../vnode";

export const Teleport = {
    __isTeleport: true,
    process(
        preVNode: VNode | null,
        nextVNode: VNode,
        container: Container,
        anchor: Container | undefined,
        parentComponent: ParentComponent | undefined,
        internals: {
            mountChildren: (
                children: VNodeChildrenArrayType,
                container: Container,
                anchor: Container | undefined,
                parentComponent?: ParentComponent
            ) => void;
            patchChildren: (
                preVNode: VNode,
                nextVNode: VNode,
                container: Container,
                anchor: Container | undefined,
                parentComponent: ParentComponent | undefined
            ) => void;
            move: (
                vnode: VNode,
                container: Container,
                anchor: Container | undefined
            ) => void;
        }
    ) {
        const { mountChildren, patchChildren, move } = internals;

        if (!preVNode) {
            const target = (nextVNode.target = document.querySelector(
                nextVNode.props?.to
            ));

            if (target) {
                mountChildren(
                    nextVNode.children as VNodeChildrenArrayType,
                    target,
                    parentComponent
                );
            } else {
                console.warn(
                    `Teleport target "${nextVNode.props?.to}" not found.`
                );
            }
        } else {
            patchChildren(
                preVNode,
                nextVNode,
                nextVNode.target,
                anchor,
                parentComponent
            );

            if (nextVNode.props?.to !== preVNode.props?.to) {
                const nextTarget = (nextVNode.target = document.querySelector(
                    nextVNode.props?.to
                ));
                (nextVNode.children as Array<VNode>).forEach((child) => {
                    move(child, nextTarget, anchor);
                });
            }
        }
    },
    remove(vNode: VNode, unmountChildren: (children: Array<VNode>) => void) {
        const { shapeFlag } = vNode;
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(vNode.children as Array<VNode>);
        }
    },
};

export function isTeleport(value: any): value is Teleport {
    return value && value?.__isTeleport;
}

export type Teleport = typeof Teleport;
