import { reactive, ReactiveFlags } from "./reactive";
import { activeEffect, track, trigger } from "./effect";
import { isObject } from "@vue/shared";

export const mutableHandlers = {
    // 用户取值操作
    get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return true;
        }
        track(target, key); // 依赖收集
        let r = Reflect.get(target, key, receiver);

        if (isObject(r)) {
            // 如果是对象， 继续代理
            return reactive(r);
        }

        return r;
    },
    // 用户设置值操作
    set(target, key, value, receiver) {
        let oldValue = target[key]; // 取旧值

        // Reflect.set: bool
        let r = Reflect.set(target, key, value, receiver);

        if (oldValue !== value) {
            // 说明值发生了变化
            // 触发更新操作
            trigger(target, key, value, oldValue);
        }

        return r;
    },
};
