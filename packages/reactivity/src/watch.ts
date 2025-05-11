import { isFunction, isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";

export function traverse(source, s = new Set()) {
    if (!isObject(source)) {
        return source;
    }

    // 考虑循环引用问题， 采用Set
    if (s.has(source)) {
        return source;
    }

    s.add(source);

    for (const key in source) {
        const value = source[key];
        traverse(value, s);
    }
}

interface WatchOptions {
    immediate?: boolean; // 是否立即执行
}

function doWatch(
    source: Object | Function,
    cb: Function,
    options?: WatchOptions
) {
    let getter: Function;
    if (isReactive(source)) {
        // 最终都处理为函数
        getter = () => traverse(source); // 直接稍后调用run的时候 会执行此函数， 直接返回对象， 只有访问属性才能依赖收集
    } else if (isFunction(source)) {
        // 如果是函数， 那么直接使用这个函数
        getter = source as Function;
    }

    let oldValue: undefined | Function;
    let cleanup: undefined | Function;
    const onCleanup = (cb: Function) => {
        cleanup = cb;
    };

    const job = () => {
        if (cb) {
            // watch API
            let newValue = effect.run();
            if (cleanup) {
                cleanup();
            }
            cb(newValue, oldValue); // 这里的oldValue是上一次的值， newValue是这一次的值

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
        return job(); // 如果是立即执行， 那么直接执行job
    }

    oldValue = effect.run(); // 保留老值
}

export function watch(
    source: Object | Function,
    cb: Function,
    options?: WatchOptions
) {
    return doWatch(source, cb, options);
}

export function watchEffect(effect: Function, options?: WatchOptions) {
    doWatch(effect, null, {
        immediate: true,
        ...options,
    });
}
