import { isObject } from "@vue/shared";
import { reactive } from "./reactive";
import {
    activeEffect,
    ReactiveEffect,
    trackEffect,
    trigger,
    triggerEffect,
} from "./effect";

function toReactive(value) {
    return isObject(value) ? reactive(value) : value;
}

export class RefImpl {
    public deps: Set<ReactiveEffect> | undefined = undefined;

    public _value;
    public __v_isRef = true;
    constructor(public rawValue) {
        this._value = toReactive(rawValue);
    }

    get value() {
        // 依赖收集
        if (activeEffect) {
            trackEffect(this.deps || (this.deps = new Set()));
        }
        return this._value;
    }

    set value(newValue) {
        if (newValue !== this.rawValue) {
            this._value = toReactive(newValue);
            this.rawValue = newValue;
            // 触发更新
            triggerEffect(this.deps);
        }
    }
}

export function ref(value) {
    return new RefImpl(value);
}

export class ObjectRefImpl {
    public __v_isRef = true;

    constructor(public _object, public _key) {}

    get value() {
        return this._object[this._key];
    }

    set value(newValue) {
        this._object[this._key] = newValue;
    }
}

export function toRef(target, key) {
    return new ObjectRefImpl(target, key);
}

export function toRefs(object) {
    const ret = {};

    for (const key in object) {
        ret[key] = toRef(object, key);
    }

    return ret;
}

export function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver);
            return res.__v_isRef ? res.value : res;
        },
        set(target, key, value, receiver) {
            const oldValue = target[key];
            if (oldValue.__v_isRef) {
                oldValue.value = value;
                return true;
            } else {
                // 这里会触发元对象的set方法
                return Reflect.set(target, key, value, receiver);
            }
        },
    });
}
