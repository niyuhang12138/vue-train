import { ShapeFlags } from "@vue/shared";
import { isSameVNode, type VNode } from "./vnode";

interface RendererOptions {
    createElement: Function;
    insert: Function;
    remove: Function;
    patchProp: Function;
    querySelector: Function;
    parentNode: Function;
    nextSibling: Function;
    setElementText: Function;
    createText: Function;
    setText: Function;
}

interface HTMLElement {
    _vnode: VNode | null; // 记录当前的虚拟节点
}

// createRanderer的作用是自定义渲染方式
export function createRenderer(options: RendererOptions) {
    const {
        createElement: hostCreateElement,
        insert: hostInsert,
        remove: hostRemove,
        patchProp: hostPatchProp,
        querySelector: hostQuerySelector,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        setElementText: hostSetElementText,
        createText: hostCreateText,
        setText: hostSetText,
    } = options;

    const mountChildren = (children: any[], el) => {
        children.forEach((child: VNode) => {
            patch(null, child, el);
        });
    };

    const unmountChildren = (children: any[]) => {
        children.forEach((child) => {
            unmount(child);
        });
    };

    const mountElement = (vnode: VNode, container, anchor = null) => {
        const { type, props, children, shapeFlag } = vnode;

        const el = (vnode.el = hostCreateElement(type));

        if (props) {
            for (const key in props) {
                hostPatchProp(el, key, null, props[key]);
            }
        }

        // 1 | 1 << 4
        //  00001
        //  10000
        //  10001
        // 10001 & 1 << 4
        //  10001
        //  10000
        //  10000
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el);
        }
        // 1 | 1 << 5
        //  000001
        //  100000
        //  100001
        // 100001 & 1 << 5
        //  100001
        //  100000
        //  100000
        else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children);
        }
        hostInsert(el, container, anchor); // 插入节点
    };

    const patchProps = (oldProps, newProps, el) => {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prev = oldProps[key];
                const next = newProps[key];
                if (prev !== next) {
                    // 更新属性
                    hostPatchProp(el, key, prev, next);
                }
            }

            // 删除旧的属性
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    };

    // 全量diff算法
    const patchKeyedChildren = (c1: Array<VNode>, c2: Array<VNode>, el) => {
        // 全量diff算法 对比过程是深度遍历 先遍历父亲, 在遍历孩子 都要对比一遍
        // 目前没有优化, 没有关心, 只对比变化的部分 blockTree patchFlags
        // 同级对比 父和父对比, 子和子对比 ... 采用的是深度遍历

        let i = 0; // 默认从0开始对比
        let e1 = c1.length - 1; // 旧的最后一个
        let e2 = c2.length - 1; // 新的最后一个

        // a b   e d
        // a b c e d

        // i = 0 / e1 = 3 / e2 = 4

        // 头部对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];

            if (isSameVNode(n1, n2)) {
                patch(n1, n2, el); // 深度遍历
            } else {
                break;
            }

            i++;
        }

        // i = 2 / e1 = 3 / e2 = 4

        // 尾部对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];

            if (isSameVNode(n1, n2)) {
                patch(n1, n2, el); // 深度遍历
            } else {
                break;
            }

            e1--;
            e2--;
        }

        // i = 2 / e1 = 1 / e2 = 2

        // a b
        // a b c
        // i = 2 / e1 = 1 / e2 = 2

        // 添加还是删除? i 比e1大 说明新的比老的长

        // i > e1 新的比老的长
        // 同序列挂载
        if (i > e1) {
            // 新增
            if (i <= e2) {
                // 看一下 如果e2往前移动了, 那么e2的下一个值肯定存在, 向前插入
                // 如果e2没有动, 那么e2的下一个值肯定不存在, 以为这向后插入
                const nextPos = e2 + 1;
                const anchor = nextPos < c2.length ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], el, anchor);
                    i++;
                }
            }
        }
        // a b c d
        // a b
        // i = 2 / e1 = 3 / e2 = 1

        // d c a b
        //     a b
        // i = 0 / e1 = 1 / e2 = -1

        // i > e2 旧的比新的长
        else if (i > e2) {
            // 删除
            while (i <= e1) {
                unmount(c1[i]);
                i++;
            }
        }

        // old | a b c d e   f g
        // new | a b e c d h f g
        // i = 2 / e1 = 4 / e2 = 5

        // c d e
        // e c d h
        else {
            let s1 = i; // s1 -> e1
            let s2 = i; // s2 -> e2
            // 这里我们要服用老节点? key
            // vue2中根据老节点创建的映射表
            // vue3中根据新的key创建的映射表
            const keyToIndexMap = new Map();
            for (let i = s2; i <= e2; i++) {
                const vnode = c2[i];
                keyToIndexMap.set(vnode.key, i);
            }

            // 有了新的映射表后, 去老的中查找一下, 看一下是否存在, 如果存在需要服用

            const toBePatched = e2 - s2 + 1; // 新的节点数量
            const newIndexToOldMap = new Array(toBePatched).fill(0);
            for (let i = s1; i <= e1; i++) {
                const child = c1[i];

                let newIndex = keyToIndexMap.get(child.key); // 通过老的key来查找对应新的索引

                if (newIndex === undefined) {
                    unmount(child); // 删除
                } else {
                    newIndexToOldMap[newIndex - s2] = i + 1;
                    patch(child, c2[newIndex], el);
                }
            }
            // 我们已经服用了节点, 并且更新了服用节点的属性, 差移动操作, 和新的里面有老的里面没有的操作

            // 如何知道新的里面有的老的里面没有

            // console.log(newIndexToOldMap);
            const seq = getSequence(newIndexToOldMap);
            // console.log(seq);

            let j = seq.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = c2[nextIndex];
                let anchor =
                    nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
                // 默认找到f 把h 插入到f的前面
                if (newIndexToOldMap[i] === 0) {
                    // 新增的
                    // 创建元素并插入
                    patch(null, nextChild, el, anchor);
                } else {
                    // 直接插入即可
                    // 倒叙插入
                    // hostInsert(nextChild.el, el, anchor);
                    // 这个插入操作比较暴力， 整个做了移动， 但是我们需要优化移动的操作
                    // [5, 3, 4, 0]
                    // 索引为1,2的不用动

                    // 优化
                    if (i !== seq[j]) {
                        // 说明需要移动
                        hostInsert(nextChild.el, el, anchor);
                    } else {
                        j--; // 说明不需要移动
                    }
                }
            }
        }
    };

    const patchChildren = (n1: VNode, n2: VNode, el) => {
        // 对比子差异
        /**
         * new          old         handle
         * text         array       del old -> set text
         * text         text        update text
         * text         null        set text
         * array        array       diff
         * array        text        del old -> set array
         * array        null        set array
         * null         array       del old
         * null         text        del old
         * null         null        do nothing
         */
        const c1 = n1.children;
        const c2 = n2.children;

        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;

        // 新的是文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧的是数组
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 删除旧的
                unmountChildren(c1);
            }
            if (c1 !== c2) {
                // 设置新的文本
                hostSetElementText(el, c2);
            }
        } else {
            // 旧的是数组
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 新的是数组
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // diff算法
                    patchKeyedChildren(c1, c2, el);
                } else {
                    // 老的是数组，新的不是数组， 删除数组
                    unmountChildren(c1);
                    // 设置新的文本
                    hostSetElementText(el, c2);
                }
            } else {
                // 旧的是文本
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetElementText(el, "");
                }
                // 新的是数组
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    mountChildren(c2, el);
                }
            }
        }
    };

    const patchElement = (n1: VNode, n2: VNode) => {
        // 对比n1和n2的属性差异
        let el = (n2.el = n1.el); // 复用旧节点
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        patchProps(oldProps, newProps, el);

        patchChildren(n1, n2, el);
    };

    const processElement = (
        n1: VNode | null,
        n2: VNode,
        container,
        anchor = null
    ) => {
        if (n1 === null) {
            // 初次渲染
            mountElement(n2, container, anchor);
        } else {
            // diff算法
            patchElement(n1, n2);
        }
    };

    const patch = (n1: VNode | null, n2: VNode, container, anchor = null) => {
        if (n1 === n2) {
            return; // 无需更新
        }
        // ni div -> n2 p

        // 如果n1 n2都有值， 但是类型不同则删除n1 换n2
        if (n1 && !isSameVNode(n1, n2)) {
            unmount(n1); // 删除n1
            n1 = null; // 置空
        }

        processElement(n1, n2, container, anchor);
    };

    const unmount = (vnode: VNode) => hostRemove(vnode.el);

    const render = (vnode: VNode, container) => {
        if (vnode === null) {
            // 卸载： 删除节点
            if (container._vnode) {
                // 渲染过 才能卸载
                unmount(container._vnode);
            }
        } else {
            // 初次渲染 更新
            patch(container._vnode || null, vnode, container);
        }

        container._vnode = vnode; // 记录当前的虚拟节点
    };

    return {
        render,
    };
}

// 贪心 + 二分 + 追溯
function getSequence(arr: Array<number>) {
    let len = arr.length;
    let result = [0];
    let resultLastIndex: number;
    let start: number;
    let end: number;
    let middle: number;

    let p = arr.slice(0); // 用来表示索引的

    for (let i = 0; i < len; i++) {
        const arrI = arr[i];
        // vue中序列中不会出现0, 如果序列中出现0的话可以忽略
        if (arrI !== 0) {
            resultLastIndex = result[result.length - 1];
            if (arr[resultLastIndex] < arrI) {
                result.push(i);
                p[i] = resultLastIndex; // 记录前驱节点
                continue;
            }

            // 这里就会出现， 当前向比最后一项大
            start = 0;
            end = result.length - 1;

            while (start < end) {
                middle = ((start + end) / 2) | 0;

                if (arr[result[middle]] < arrI) {
                    start = middle + 1;
                } else {
                    end = middle;
                }
            }

            // middle 就是第一个比当前值大的值
            if (arrI < arr[result[start]]) {
                p[i] = result[start - 1]; // 记录前驱节点
                result[start] = i;
            }
        }
    }

    // 追溯
    let i = result.length;
    let last = result[i - 1];

    while (i-- > 0) {
        result[i] = arr[last];
        last = p[last];
    }

    return result;
}
