import { Target, toReactive } from "./reactive";
import { activeEffect, ReactiveEffect } from "./effect";
import { createDep, Dep, trackEffect, triggerEffect } from "./reactiveEffect";
import { ComputedRefImpl } from "./computed";
import { ReactiveFlags } from "./constants";

export function ref(value: unknown) {
    return createRef(value);
}

/**
 * 创建Ref对象
 * @param value
 * @returns
 */
function createRef(value: unknown) {
    return new RefImpl(value);
}

export class RefImpl {
    public [ReactiveFlags.IS_REF] = true;
    public _value: unknown; // 用来保存ref的值
    public dep: Dep;
    constructor(public rawValue: unknown) {
        this._value = toReactive(rawValue); // 如果传递的原始值是对象，则转换为响应式对象
    }

    get value() {
        // 依赖收集
        trackRefValue(this);

        return this._value;
    }

    set value(newValue) {
        if (newValue !== this.rawValue) {
            this._value = newValue;
            this.rawValue = newValue;
            // 触发更新
            triggerRefValue(this);
        }
    }
}

// 依赖收集
export function trackRefValue(ref: RefImpl | ComputedRefImpl) {
    if (!activeEffect) return;

    let dep = ref.dep;

    if (!dep) {
        // 如果没有依赖关系， 则创建一个新的依赖关系
        dep = ref.dep = createDep((key: any) => {
            ref.dep = undefined;
        }, "undefined");
    }

    trackEffect(activeEffect, dep);
}

// 触发更新
export function triggerRefValue(ref: RefImpl | ComputedRefImpl) {
    let dep = ref.dep;
    if (!dep) return; // 没有依赖关系
    triggerEffect(dep); // 触发更新
}

export class ObjectRefImpl {
    public [ReactiveFlags.IS_REF] = true; // 标识是ref对象
    constructor(public _object: Target, public _key: string | symbol) {}

    get value() {
        return this._object[this._key];
    }

    set value(newValue: unknown) {
        this._object[this._key] = newValue;
    }
}

export function toRef(target: Target, key: string | symbol): ObjectRefImpl {
    return new ObjectRefImpl(target, key);
}

export function toRefs(object: Target): Record<string | symbol, ObjectRefImpl> {
    const ret = {};
    for (const key in object) {
        ret[key] = toRef(object, key);
    }
    return ret;
}

/**
 * proxyRefs 函数会返回一个代理对象， 这个对象是对原对象的一个代理， 通过这个代理对象可以访问原对象的属性
 * 实际上如果读取的是一个Ref对象，则返回其value属性的值，如果读取的是一个普通对象或者Reactive，则返回其属性值
 * @param objectWithRef
 * @returns
 */
export function proxyRefs(objectWithRef) {
    return new Proxy(objectWithRef, {
        get(target: Target, key: string | symbol, receiver: unknown) {
            const r = Reflect.get(target, key, receiver);
            return r && isRef(r) ? r.value : r; // 如果是ref对象， 则返回值
        },
        set(target, key, value, receiver) {
            const r = Reflect.get(target, key, receiver);
            if (r && isRef(r)) {
                r.value = value; // 如果是ref对象， 则设置值
                return true;
            } else {
                return Reflect.set(target, key, value, receiver);
            }
        },
    });
}

export function isRef(value: unknown): value is RefImpl {
    return !!(value && value[ReactiveFlags.IS_REF]);
}
