import { isObject } from "@vue/shared";
import { mutableHandlers } from "./baseHandlers";

// 补丁
export const enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
}

export function isReactive(target): boolean {
    return !!(target && target[ReactiveFlags.IS_REACTIVE]);
}

// 缓存代理对象
const reactiveMap = new WeakMap(); // key只能是对象

export function reactive(target) {
    // 如果是一个对象， 先判断一下是否已经被代理过了
    // 这里使用WeakMap来存储代理对象， 这样可以避免内存泄漏
    // WeakMap的key只能是对象， 所以这里使用对象作为key
    // 这里的target是一个对象， 但是我们需要的是一个代理对象
    // 所以我们需要判断一下target是否已经被代理过了
    // 如果已经被代理过了， 那么直接返回代理对象即可

    // 不对非对象类型进行劫持
    if (!isObject(target)) {
        return target;
    }

    // 判断是否被代理过了, 如果能处罚get到__v_isReactive属性， 说明已经被代理过了
    if (target[ReactiveFlags.IS_REACTIVE]) {
        return target;
    }

    const existsProxy = reactiveMap.get(target);
    if (existsProxy) {
        return existsProxy;
    }

    const proxy = new Proxy(target, mutableHandlers);

    // 缓存一下代理过的对象， 下次在进行的代理的时候直接拿出来即可
    reactiveMap.set(target, proxy);
    return proxy;
}
