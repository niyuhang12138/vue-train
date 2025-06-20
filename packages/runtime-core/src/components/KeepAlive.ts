import { ShapeFlags } from "@vue/shared";
import { Container, getCurrentInstance, onMounted, onUpdated, VNode } from "..";

export const KeepAlive = {
    __isKeepAlive: true,
    props: {
        max: Number,
    },
    setup(props, { slots }) {
        const { max } = props;
        const keys = new Set(); // 用来记录那些组件缓存国
        const cache = new Map(); // 缓存表

        function reset(vnode: VNode) {
            let shapeFlag = vnode.shapeFlag;
            if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
                shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
            }
            if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
                shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
            }
            vnode.shapeFlag = shapeFlag;
        }

        function unmount(vnode: VNode) {
            reset(vnode);
            _unmount(vnode); // 调用组件的deactivate方法
        }

        function pruneCacheEntry(key) {
            keys.delete(key);
            const cached = cache.get(key);
            cached && unmount(cached);
        }

        let pendingCacheKey = null;
        const instance = getCurrentInstance();

        const cacheSubTree = () => {
            cache.set(pendingCacheKey, instance.subTree); // 缓存组件的虚拟节点
        };

        const {
            move,
            createElement,
            unmount: _unmount,
        } = instance.ctx.renderer;
        instance.ctx.activate = function (
            vnode: VNode,
            container: Container,
            anchor: Container
        ) {
            move(vnode, container, anchor);
        };

        const storageContent = createElement("div");
        instance.ctx.deactivate = function (vnode: VNode) {
            move(vnode, storageContent, null); // 将组件移动到一个空的容器中
        };

        onMounted(cacheSubTree);

        onUpdated(cacheSubTree);

        return () => {
            const vnode: VNode = slots.default && slots.default();
            if (!vnode) return;

            const comp = vnode.type;

            const key = vnode.key ?? comp;
            pendingCacheKey = key; // 记录当前组件的key

            const cacheVnode: VNode = cache.get(key);

            if (cacheVnode) {
                vnode.component = cacheVnode.component;
                vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
                keys.delete(key);
                keys.add(key);
            } else {
                keys.add(key);

                if (max && keys.size > max) {
                    debugger;
                    pruneCacheEntry(keys.values().next().value);
                }
            }

            vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;

            return vnode;
        };
    },
};

export type KeepAlive = typeof KeepAlive;

export const isKeepAlive = (val: any): val is KeepAlive => {
    return val && val.__isKeepAlive === true;
};
