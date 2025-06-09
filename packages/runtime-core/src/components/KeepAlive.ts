export const KeepAlive = {
    __isKeepAlive: true,
    setup(props, { slots }) {
        const keys = new Set(); // 用来记录那些组件缓存国
        const cache = new Map(); // 缓存表
        return () => {
            const vnode = slots.default && slots.default();
            if (!vnode) return;

            const comp = vnode.type;

            const key = vnode.key ?? comp;

            return vnode;
        };
    },
};

export type KeepAlive = typeof KeepAlive;

export const isKeepAlive = (val: any): val is KeepAlive => {
    return val && val.__isKeepAlive === true;
};
