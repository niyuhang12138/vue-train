import { reactive, reactiveMap, Target, toRaw } from "./reactive";
import { activeEffect } from "./effect";
import { track, trigger } from "./reactiveEffect";
import { isObject } from "@vue/shared";
import { isRef, RefImpl } from "./ref";
import { ReactiveFlags } from "./constants";

export const mutableHandlers = {
    // 用户取值操作
    get(target: Target, key: string | symbol, receiver: unknown) {
        // 判断是否是代理对象
        if (key === ReactiveFlags.IS_REACTIVE) {
            return true;
        } else if (key === ReactiveFlags.RAW) {
            return target;
        }

        // 依赖收集
        track(target, key);

        // 取值操作
        let r = Reflect.get(target, key, receiver);

        if (isRef(r)) {
            return r.value;
        }

        if (isObject(r)) {
            // 如果是对象， 继续代理
            return reactive(r);
        }

        return r;
    },
    // 用户设置值操作
    set(
        target: Target,
        key: string | symbol,
        value: unknown,
        receiver: unknown
    ) {
        let oldValue = target[key]; // 取旧值

        // Reflect.set: bool
        let result = Reflect.set(target, key, value, receiver);

        if (oldValue !== value) {
            // 触发更新
            trigger(target, key, value, oldValue);
        }

        return result;
    },
};
