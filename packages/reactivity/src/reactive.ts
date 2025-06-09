import { isObject } from "@vue/shared";
import { mutableHandlers } from "./baseHandlers";
import { ReactiveFlags } from "./constants";

export interface Target extends Object {
    [ReactiveFlags.IS_REACTIVE]?: boolean;
    [ReactiveFlags.IS_REF]?: boolean;
}

// 缓存代理对象，复用，使用WeakMap避免内存泄漏
export const reactiveMap = new WeakMap<Target, any>(); // key只能是对象

// 定义代理对象的类型
export type Reactive<T extends Target> = ProxyHandler<T>;

/**
 *
 * @param target 需要代理的对象
 * @description reactive 函数会返回一个代理对象， 这个对象是对原对象的一个代理， 通过这个代理对象可以访问原对象的属性
 * @returns
 */
export function reactive<T extends object>(target: T): Reactive<T>;
export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap);
}

function createReactiveObject(
    target: Target,
    baseHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<Target, any>
) {
    // reactive 函数必须传入一个对象
    if (!isObject(target)) {
        return target;
    }

    if (target[ReactiveFlags.IS_REACTIVE]) {
        return target;
    }

    // 查看缓存，如果已经代理过了，则拿到缓存的代理对象
    const existsProxy = proxyMap.get(target);
    if (existsProxy) {
        return existsProxy;
    }

    const proxy = new Proxy(target, baseHandlers);

    // 缓存一下代理过的对象， 下次在进行的代理的时候直接拿出来即可
    proxyMap.set(target, proxy);

    return proxy;
}

export function toReactive(value) {
    return isObject(value) ? reactive(value) : value;
}

export function toRaw<T>(observed: T): T {
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? raw : observed;
}

export function isReactive(target: unknown): target is Target {
    return !!(target && target[ReactiveFlags.IS_REACTIVE]);
}
