import { isFunction, isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive, Target } from "./reactive";
import { isRef, RefImpl } from "./ref";

export function traverse(
    source: unknown,
    depth?: number,
    currentDepth = 0,
    seen = new Set()
) {
    if (!isObject(source)) {
        return source;
    }

    if (depth) {
        if (currentDepth >= depth) {
            return source;
        }
    }
    currentDepth++; // 根据deep 属性来看是否是深度

    // 考虑循环引用问题， 采用Set
    if (seen.has(source)) {
        return source;
    }

    seen.add(source);

    for (const key in source) {
        const value = source[key];
        return traverse(value, depth, currentDepth, seen); // 递归遍历
    }
}

interface WatchOptions {
    immediate?: boolean; // 是否立即执行
    deep?: boolean; // 是否深度监听
}

function doWatch(
    source: Target | Function,
    cb: Function,
    options?: WatchOptions
) {
    let getter: Function;

    if (isReactive(source)) {
        // 最终都处理为函数
        getter = () =>
            traverse(source, options?.deep === false ? 1 : undefined); // 直接稍后调用run的时候 会执行此函数， 直接返回对象， 只有访问属性才能依赖收集
    } else if (isRef(source)) {
        getter = () => source.value;
    } else if (isFunction(source)) {
        // 如果是函数， 那么直接使用这个函数
        getter = source;
    }

    let oldValue: undefined | Function;

    let clean: () => void | undefined = undefined;

    const onCleanup = (fn) => {
        clean = () => {
            fn();
            clean = undefined;
        };
    };

    const job = () => {
        if (cb) {
            // watch API
            let newValue = effect.run();

            if (clean) {
                clean(); // 如果有清理函数， 那么先执行清理函数
            }

            cb(newValue, oldValue, onCleanup); // 这里的oldValue是上一次的值， newValue是这一次的值

            oldValue = newValue;
        } else {
            // watchEffect API
            effect.run();
        }
    };

    // watch 本身就是一个effect + 自定义scheduler
    // watchEffect 本身就是一个effect
    const effect = new ReactiveEffect(getter, job);

    if (options?.immediate) {
        job(); // 如果是立即执行， 那么直接执行job
    } else {
        oldValue = effect.run(); // 保留老值
    }

    const unwatch = () => effect.stop();

    return unwatch; // 返回一个取消函数
}

/**
 * watch API
 * @param source
 * @param cb
 * @param options
 * @returns
 */
export function watch(
    source: Target | Function,
    cb: Function,
    options?: WatchOptions
) {
    return doWatch(source, cb, options);
}

export function watchEffect(effect: Function, options?: WatchOptions) {
    doWatch(effect, null, {
        ...options,
        immediate: true,
    });
}
