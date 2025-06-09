import { VNode } from "../vnode";
import { getCurrentInstance, h } from "..";

export interface Transition {
    beforeEnter?: (el: Element) => void;
    enter?: (el: Element, done?: () => void) => void;
    leave?: (el: Element, done?: () => void) => void;
}

function nextFrame(fn: () => void) {
    requestAnimationFrame(() => {
        requestAnimationFrame(fn);
    });
}

export function resolveTransitionProps(props: Record<string, any>) {
    const {
        name = "v",
        enterFromClass = `${name}-enter-from`,
        enterActiveClass = `${name}-enter-active`,
        enterToClass = `${name}-enter-to`,
        leaveFromClass = `${name}-leave-from`,
        leaveActiveClass = `${name}-leave-active`,
        leaveToClass = `${name}-leave-to`,
        onBeforeEnter,
        onEnter,
        onLeave,
    } = props;

    return {
        onBeforeEnter(el) {
            onBeforeEnter && onBeforeEnter(el);
            el.classList.add(enterFromClass);
            el.classList.add(enterActiveClass);
        },
        onEnter(el, done) {
            const resolve = () => {
                el.classList.remove(enterToClass);
                el.classList.remove(enterActiveClass);
                done && done();
            };
            onEnter && onEnter(el, resolve);

            // 添加后不能立即移除
            nextFrame(() => {
                // 保证动画的产生
                el.classList.remove(enterFromClass);
                el.classList.add(enterToClass);

                if (!onEnter || onEnter.length <= 1) {
                    // 保证动画的结束
                    el.addEventListener("transitionend", resolve);
                }
            });
        },
        onLeave(el, done) {
            const resolve = () => {
                el.classList.remove(leaveActiveClass);
                el.classList.remove(leaveToClass);
                done && done();
            };

            el.classList.add(leaveActiveClass);
            el.classList.add(leaveFromClass);
            document.body.offsetHeight; // 强制重绘

            nextFrame(() => {
                el.classList.remove(leaveFromClass);
                el.classList.add(leaveToClass);

                if (!onLeave || onEnter.length <= 1) {
                    // 保证动画的结束
                    el.addEventListener("transitionend", resolve);
                }
            });

            onLeave && onLeave(el, done);
        },
    };
}

export function Transition(
    props: Record<string, any>,
    { slots }: { slots: Record<string, () => VNode> }
) {
    // 函数式组件功能比较少 为了方便函数式组件除了属性
    // 处理属性后传输给状态组件 setup
    return h(BaseTransitionImpl, resolveTransitionProps(props), slots);
}

const BaseTransitionImpl = {
    // 真正的组件只需要渲染封装好的路街
    props: {
        onBeforeEnter: Function,
        onEnter: Function,
        onLeave: Function,
    },
    setup(props, { slots }) {
        return () => {
            const vnode: VNode = slots.default && slots.default();
            const instance = getCurrentInstance();
            if (!vnode) return;

            // 渲染前 和 渲染后
            // const oldVnode = instance.subTree; // 之前的虚拟节点
            vnode.transition = {
                beforeEnter: props.onBeforeEnter,
                enter: props.onEnter,
                leave: props.onLeave,
            };

            return vnode;
        };
    },
};
