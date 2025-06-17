import { hasOwn, isArray, isString, PatchFlags, ShapeFlags } from "@vue/shared";
import {
    Component,
    Fragment,
    FunctionalComponent,
    Instance,
    isSameVNode,
    ParentComponent,
    VNode,
    VNodeTypes,
} from "./vnode";
import { getSequence } from "./seq";
import { Text } from "./vnode";
import { isRef, reactive, Reactive, ReactiveEffect } from "@vue/reactivity";
import { queueJob } from "./scheduler";
import { createComponentInstance, setupComponent } from "./component";
import { invokeArray } from "./apiLifecycle";
import { createVNode } from "./vnode";
import { h } from "./h";
import { isKeepAlive, Teleport } from "./components";

export interface RenderOptions<HostNode = any, HostElement = any> {
    patchProp(
        el: HostElement,
        key: string,
        prevValue: any,
        nextValue: any
    ): void;
    insert(child: HostNode, parent: HostNode, anchor?: HostNode | null): void;
    remove(child: HostNode): void;
    createElement(type: VNodeTypes): HostElement;
    createText(text: string): HostNode;
    createComment(common: string): HostNode;
    setText(node: HostNode, text: string): void;
    setElementText(el: HostElement, text: string): void;
    parentNode(node: HostNode): HostNode | null;
    nextSibling(node: HostNode): HostNode | null;
    querySelector(selector: string): HostElement | null;
    cloneNode(node: HostNode): HostNode;
}

export type Container = Record<string | symbol, any> & {
    _vnode?: VNode;
};

/**
 * core中不关心如何渲染，只关心渲染的API
 * 可以跨平台使用
 * @param renderOptions
 * @returns
 */
export function createRenderer(renderOptions: RenderOptions) {
    const {
        insert: hostInsert,
        remove: hostRemove,
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        setText: hostSetText,
        setElementText: hostSetElementText,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        querySelector: hostQuerySelector,
        cloneNode: hostCloneNode,
        patchProp: hostPatchProp,
    } = renderOptions;

    const normalize = (children: Array<VNode | string | number>) => {
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            // 递归渲染子节点

            if (typeof child === "string" || typeof child === "number") {
                child = children[i] = createVNode(Text, null, String(child));
            }
        }
        return children as Array<VNode>;
    };

    const mountChildren = (
        children: Array<VNode | string | number>,
        container: Container,
        anchor: Container,
        parentComponent?: ParentComponent
    ) => {
        normalize(children);
        children.forEach((child: VNode) => {
            // 递归渲染子节点
            patch(null, child, container, anchor, parentComponent);
        });
    };

    /**
     * 渲染一个虚拟节点到容器中
     * @param vnode
     * @param container
     */
    const mountElement = (
        vnode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        const { type, children, props, shapeFlag, transition } = vnode;

        // 第一次渲染的时候我们让虚拟节点和真实dom创建关联，vnode.el = 真实dom
        // 第二次渲染新的vnode,可以和上一次的vnode做对比，之后更新对应的el元素，可以后续复用这个dom元素
        const el = (vnode.el = hostCreateElement(type));

        if (props) {
            for (const key in props) {
                hostPatchProp(el, key, null, props[key]);
            }
        }

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children as string);
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(
                children as Array<VNode>,
                el,
                anchor,
                parentComponent
            );
        }

        if (transition) {
            transition.beforeEnter(el);
        }

        hostInsert(el, container, anchor);

        if (transition) {
            transition.enter(el);
        }
    };

    /**
     * 更新元素的属性
     * @param prevProps 之前的属性
     * @param nextProps 下一个属性
     * @param container 容器
     */
    const patchProps = (
        prevProps: Record<string, any>,
        nextProps: Record<string, any>,
        container: Container
    ) => {
        for (const key in nextProps) {
            hostPatchProp(container, key, prevProps[key], nextProps[key]);
        }

        for (const key in prevProps) {
            if (!(key in nextProps)) {
                // 如果之前的属性在新的属性中不存在，则需要移除
                hostPatchProp(container, key, prevProps[key], null);
            }
        }
    };

    const unmountChildren = (
        children: Array<VNode>,
        parentComponent?: ParentComponent
    ) => {
        children.forEach((child: VNode) => {
            unmount(child, parentComponent);
        });
    };

    /**
     * 全量diff：比较两个儿子的差异更新el
     * @param prevChildren
     * @param nextChildren
     * @param container
     */
    const patchKeyedChildren = (
        prevChildren: Array<VNode>,
        nextChildren: Array<VNode>,
        container: Container,
        parentComponent?: ParentComponent
    ) => {
        // 减少对比范围，先从头开始比，在从尾部开始比，确定不一样的范围
        // 从头对比，在从尾部对比，如果多出在代表新增，如果少出在代表删除

        let i = 0;
        let e1 = prevChildren.length - 1;
        let e2 = nextChildren.length - 1;

        //
        while (i <= e1 && i <= e2) {
            // 任何一方结束渲染 就要终止对比
            const prevVNode = prevChildren[i];
            const nextVNode = nextChildren[i];
            if (isSameVNode(prevVNode, nextVNode)) {
                patch(prevVNode, nextVNode, container);
            } else {
                break;
            }
            i++;
        }

        while (i <= e1 && i <= e2) {
            const prevVNode = prevChildren[e1];
            const nextVNode = nextChildren[e2];
            if (isSameVNode(prevVNode, nextVNode)) {
                patch(prevVNode, nextVNode, container);
            } else {
                break;
            }
            e1--;
            e2--;
        }

        /**
         * a b c
         * a b c d
         * i e1 e2
         * 3 2 3
         */

        /**
         * a b c
         * d e a b c
         * i e1 e2
         * 0 -1 1
         */

        // i > e1 && i >= e2 新增

        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                let anchor =
                    nextPos < nextChildren.length
                        ? nextChildren[nextPos].el
                        : void 0;
                while (i <= e2) {
                    patch(null, nextChildren[i], container, anchor);
                    i++;
                }
            }
        }

        /**
         * a b c
         * a b
         * i e1 e2
         * 2 2 1
         */

        /**
         * a b c
         * c
         * i e1 e2
         * 0 1 -1
         */

        // i <= e1 && i > e2 删除
        else if (i > e2) {
            if (i <= e1) {
                while (i <= e1) {
                    unmount(prevChildren[i], parentComponent);
                    i++;
                }
            }
        } else {
            // 其他就是未知序列

            /**
             * a b c d e f g
             * a b e c d h f g
             * i e1 e2
             * 2 4 5
             */
            let s1 = i;
            let s2 = i;
            // s1 -> e1
            // s2 -> e2
            const keyToNewIndexMap = new Map<string, number>();

            for (let i = s2; i <= e2; i++) {
                const nextVNode = nextChildren[i];
                keyToNewIndexMap.set(nextVNode.key as string, i);
            }

            let toBePatched = e2 - s2 + 1; // 要倒叙插入的个数
            let newIndexToOldMapIndex = new Array(toBePatched).fill(0);

            for (let i = s1; i <= e1; i++) {
                const prevVNode = prevChildren[i];
                const newIndex = keyToNewIndexMap.get(prevVNode.key as string);

                // 老的节点在新的节点中不存在
                if (newIndex === undefined) {
                    unmount(prevVNode, parentComponent);
                } else {
                    newIndexToOldMapIndex[newIndex - s2] = i + 1; // +1是为了0位置元素和不存在的元素不冲突
                    // 比较前后节点的差异，更新属性和儿子
                    patch(prevVNode, nextChildren[newIndex], container); // 复用节点
                }
            }

            const seq = getSequence(newIndexToOldMapIndex);

            let j = seq.length - 1;
            // 调整顺序
            // 我们可以按照新的队列 倒序插入insertBefore 通过参照物往前面插入

            // 插入的过程中新的元素可能多 需要创建

            for (let i = toBePatched - 1; i >= 0; i--) {
                let newIndex = s2 + i; // 新的元素的索引
                let anchor =
                    newIndex + 1 < nextChildren.length
                        ? nextChildren[newIndex + 1].el
                        : null;

                const vNode = nextChildren[newIndex];

                if (i !== seq[j]) {
                    // 新的元素
                    hostInsert(vNode.el, container, anchor);
                } else {
                    j--;
                }
            }
        }
    };

    /**
     * 更新子元素
     * @param prevVNode
     * @param nextVNode
     * @param container
     */
    const patchChildren = (
        prevVNode: VNode,
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        // 儿子有可能是数组 / 文本
        const { el } = nextVNode;
        const c1 = prevVNode.children;
        const c2 = isArray(nextVNode.children)
            ? normalize(nextVNode.children as Array<VNode | string | number>)
            : nextVNode.children;
        const prevShapeFlag = prevVNode.shapeFlag;
        const nextShapeFlag = nextVNode.shapeFlag;

        if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 新的是文本
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unmountChildren(c1 as Array<VNode>, parentComponent);
            }
            if (c1 !== c2) {
                hostSetElementText(el, c2 as string);
            }
        }
        // 新的不会是文本
        else {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 老的是数组
                if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 新的也是数组
                    // TODO: 全量diff
                    patchKeyedChildren(
                        c1 as Array<VNode>,
                        c2 as Array<VNode>,
                        el
                    );
                } else {
                    // 新的不是数组
                    unmountChildren(c1 as Array<VNode>, parentComponent);
                }
            } else {
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    // 老的是文本
                    hostSetElementText(el, "");
                }
                if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    mountChildren(
                        c2 as Array<VNode>,
                        el,
                        anchor,
                        parentComponent
                    );
                }
            }
        }
    };

    const patchBlockChildren = (
        prevVNode: VNode,
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        for (let i = 0; i < nextVNode.dynamicChildren!.length; i++) {
            patch(
                prevVNode.dynamicChildren[i],
                nextVNode.dynamicChildren![i],
                container,
                anchor,
                parentComponent
            );
        }
    };

    /**
     * 更新元素
     * 比较元素的差异
     * 比较属性的差异
     * 比较子元素的差异
     * @param prevVNode
     * @param nextVNode
     * @param container
     */
    const patchElement = (
        prevVNode: VNode,
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        let el = (nextVNode.el = prevVNode.el); // dom元素复用
        const prevProps = prevVNode.props || {};
        const nextProps = nextVNode.props || {};

        const { patchFlag, dynamicChildren } = nextVNode;

        if (patchFlag) {
            if (patchFlag & PatchFlags.TEXT) {
                debugger;
                // 只要文本是动态的 只比较文本
                hostSetElementText(el, nextVNode.children as string);
            }

            if (patchFlag & PatchFlags.CLASS) {
                hostPatchProp(el, "class", prevProps.class, nextProps.class);
            }

            if (patchFlag & PatchFlags.STYLE) {
                hostPatchProp(el, "style", prevProps.style, nextProps.style);
            }
        } else {
            patchProps(prevProps, nextProps, el);
        }

        if (dynamicChildren) {
            patchBlockChildren(
                prevVNode,
                nextVNode,
                el,
                anchor,
                parentComponent
            );
        } else {
            // 全量diff
            patchChildren(prevVNode, nextVNode, el, anchor, parentComponent);
        }
    };

    /**
     * 元素的处理逻辑
     * @param prevVNode
     * @param nextVNode
     * @param container
     */
    const processElement = (
        prevVNode: VNode | null,
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        if (!prevVNode) {
            // 如果之前没有虚拟节点，说明是第一次渲染
            mountElement(nextVNode, container, anchor, parentComponent);
        } else {
            patchElement(
                prevVNode,
                nextVNode,
                container,
                anchor,
                parentComponent
            );
        }
    };

    const processText = (
        prevVNode: VNode | null,
        nextVNode: VNode,
        container: Container
    ) => {
        if (!prevVNode) {
            // 虚拟节点中需要关联真实节点
            hostInsert(
                (nextVNode.el = hostCreateText(nextVNode.children as string)),
                container
            );
        } else {
            nextVNode.el = prevVNode.el; // 复用文本节点
            if (nextVNode.children !== prevVNode.children) {
                hostSetText(nextVNode.el, nextVNode.children as string);
            }
        }
    };

    const processFragment = (
        prevVNode: VNode | null,
        nextVNode: VNode,
        container: Container,
        anchor: Container,
        parentComponent?: ParentComponent
    ) => {
        if (!prevVNode) {
            // 如果之前没有虚拟节点，说明是第一次渲染
            mountChildren(
                nextVNode.children as Array<VNode>,
                container,
                anchor,
                parentComponent
            );
        } else {
            // 更新子节点
            patchChildren(
                prevVNode,
                nextVNode,
                container,
                anchor,
                parentComponent
            );
        }
    };

    const updateComponentPreRender = (instance: Instance, next: VNode) => {
        instance.next = void 0; // 清空下一个虚拟节点
        instance.vNode = next; // 更新当前虚拟节点
        updateProps(instance, instance.props, next.props);
        // 组件更新的时候需要更新插槽
        Object.assign(instance.slots, next.children || {});
    };

    function renderComponent(instance: Instance) {
        const { render, vNode, proxy, attrs, slots } = instance;
        if (vNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            return render.call(proxy, proxy);
        } else {
            return (vNode.type as FunctionalComponent)(attrs || {}, {
                slots,
            });
        }
    }

    const setupRenderEffect = (
        instance: Instance,
        container: Container,
        anchor?: Container
    ) => {
        const componentUpdateFn = () => {
            // 我们要在这里区分，是第一次还是之后的
            const { bm, m } = instance;
            if (!instance.isMounted) {
                if (bm) {
                    invokeArray(bm);
                }
                const subTree = renderComponent(instance);
                patch(null, subTree, container, anchor, instance);
                instance.subTree = subTree;
                instance.isMounted = true;

                if (m) {
                    // 组件挂载完成
                    invokeArray(m);
                }
            } else {
                // 基于状态的属性更新

                const { next, bu, u } = instance;

                if (next) {
                    // 更新属性插槽
                    updateComponentPreRender(instance, next);
                }

                if (bu) {
                    invokeArray(bu);
                }

                const subTree = renderComponent(instance);
                patch(instance.subTree, subTree, container, anchor, instance);
                instance.subTree = subTree;

                if (u) {
                    // 组件更新完成
                    invokeArray(u);
                }
            }
        };

        const update = (instance.update = () => {
            effect.run();
        });

        const effect = new ReactiveEffect(componentUpdateFn, () =>
            queueJob(update)
        );

        update();
    };

    const mountComponent = (
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        // 1. 先创建组件实例
        const instance = (nextVNode.component = createComponentInstance(
            nextVNode,
            parentComponent
        ));

        if (isKeepAlive(nextVNode.type)) {
            instance.ctx.renderer = {
                createElement: hostCreateElement, // 内部需要创建一个div来缓存dom
                move(vnode: VNode, container: Container, anchor: Container) {
                    // 需要把之前的dom移动到新的容器中
                    hostInsert(vnode.component.subTree.el, container);
                },
                unmount, // 如果组件切换需要将现在容器中的元素移除
            };
        }

        // 2. 给实例的属性赋值
        setupComponent(instance);

        // 3. 创建一个effect
        setupRenderEffect(instance, container, anchor);
    };

    const hasPropsChange = (
        prevProps: Record<string, any>,
        nextProps: Record<string, any>
    ) => {
        if (Object.keys(prevProps).length !== Object.keys(nextProps).length) {
            return true;
        }
        for (const key in nextProps) {
            if (nextProps[key] !== prevProps[key]) {
                return true;
            }
        }
        return false;
    };

    const updateProps = (
        instance: Instance,
        prevProps: Record<string, any>,
        nextProps: Record<string, any>
    ) => {
        if (hasPropsChange(prevProps, nextProps)) {
            for (const key in nextProps) {
                instance.props[key] = nextProps[key];
            }

            for (const key in instance.props) {
                if (!(key in nextProps)) {
                    // 如果新的属性中没有这个属性，则需要删除
                    delete instance.props[key];
                }
            }
        }
    };

    const shouldComponentUpdate = (n1: VNode, n2: VNode) => {
        const { props: prevProps, children: prevChildren } = n1;
        const { props: nextProps, children: nextChildren } = n2;

        if (prevChildren || nextChildren) return true; // 如果有插槽直接更新

        if (prevProps === nextProps) return false; // 如果属性没有变化则不更新

        return hasPropsChange(prevProps || {}, nextProps || {}); // 如果属性有变化则更新
    };

    const updateComponent = (prevVNode: VNode, nextVNode: VNode) => {
        const instance = (nextVNode.component = prevVNode.component);

        if (shouldComponentUpdate(prevVNode, nextVNode)) {
            instance.next = nextVNode; // 记录下一个虚拟节点
            instance.update();
        }
    };

    /**
     * 组件的处理
     * @param prevVNode
     * @param nextVNode
     * @param container
     * @param anchor
     */
    const processComponent = (
        prevVNode: VNode | null,
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        if (!prevVNode) {
            if (nextVNode.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
                parentComponent.ctx.activate(nextVNode, container, anchor);
            } else {
                mountComponent(nextVNode, container, anchor, parentComponent);
            }
        } else {
            // 组件的更新
            updateComponent(prevVNode, nextVNode);
        }
    };

    /**
     * 渲染走这里，更新也走这里
     * @param prevVNode 之前的虚拟节点
     * @param nextVNode 下一个虚拟节点
     * @param container 容器
     */
    const patch = (
        prevVNode: VNode | null,
        nextVNode: VNode,
        container: Container,
        anchor?: Container,
        parentComponent?: ParentComponent
    ) => {
        if (prevVNode === nextVNode) {
            // 两次渲染同一个虚拟节点直接跳过
            return;
        }

        if (prevVNode && !isSameVNode(prevVNode, nextVNode)) {
            // 如果不是相同节点
            unmount(prevVNode, parentComponent);
            prevVNode = null; // 后面会执行nextVNode的渲染逻辑
        }

        const { type, shapeFlag, ref } = nextVNode;

        switch (type) {
            case Text:
                processText(prevVNode, nextVNode, container);
                break;
            case Fragment:
                processFragment(
                    prevVNode,
                    nextVNode,
                    container,
                    anchor,
                    parentComponent
                );
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(
                        prevVNode,
                        nextVNode,
                        container,
                        anchor,
                        parentComponent
                    );
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    // 对组件的处理 vue3中函数和式组件 已经废弃 没有性能节约
                    processComponent(
                        prevVNode,
                        nextVNode,
                        container,
                        anchor,
                        parentComponent
                    );
                } else if (shapeFlag & ShapeFlags.TELEPORT) {
                    (type as Teleport).process(
                        prevVNode,
                        nextVNode,
                        container,
                        anchor,
                        parentComponent,
                        {
                            mountChildren,
                            patchChildren,
                            move(
                                vnode: VNode,
                                container: Container,
                                anchor: Container
                            ) {
                                hostInsert(
                                    vnode.component
                                        ? vnode.component.subTree.el
                                        : vnode.el,
                                    container,
                                    anchor
                                );
                            },
                        }
                    );
                }
                break;
        }

        if (ref) {
            setRef(ref, nextVNode);
        }
    };

    const setRef = (ref: VNode["ref"], vnode: VNode) => {
        const value =
            vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
                ? vnode.component.exposed || vnode.component.proxy
                : vnode.el;

        if (isRef(ref)) {
            ref.value = value; // 如果是ref则直接赋值
        }
    };

    const unmount = (vnode: VNode, parentComponent?: ParentComponent) => {
        const preformRemove = () => {
            hostRemove(vnode.el);
        };
        if (vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
            parentComponent.ctx.deactivate(vnode);
        } else if (vnode.type === Fragment) {
            unmountChildren(vnode.children as Array<VNode>, parentComponent);
        } else if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
            // 组件的卸载 实际上是卸载组件的子树
            const um = vnode.component.um;
            if (um) {
                invokeArray(um);
            }
            unmount(vnode.component.subTree, parentComponent);
        } else if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
            (vnode.type as Teleport).remove(vnode, unmountChildren);
        } else {
            const { el } = vnode;
            if (el) {
                if (vnode.transition) {
                    vnode.transition.leave(vnode.el as Element, preformRemove);
                } else {
                    preformRemove();
                }
            }
        }
    };

    /**
     * 将虚拟节点进行渲染
     * 多次调用render 会进行虚拟节点的比较，在进行更新
     * @param vnode 虚拟节点
     * @param container 容器
     */
    const render = (vnode: VNode | null, container: Container) => {
        if (vnode === null) {
            // 移除当前虚拟节点
            if (container._vnode) {
                unmount(container._vnode);
            }
        } else {
            // 将虚拟节点变成真实节点进行渲染
            patch(container._vnode || null, vnode, container);

            // 记录当前容器的虚拟节点
            container._vnode = vnode;
        }
    };

    return {
        render,
    };
}
