import { isFunction } from "@vue/shared";
import {
    activeEffect,
    effect,
    ReactiveEffect,
    track,
    trackEffect,
    triggerEffect,
} from "./effect";

type ComputedGetter = () => any;
type ComputedSetter = (value: any) => void;

interface ComputedOptions {
    get: ComputedGetter;
    set: ComputedSetter;
}

class ComputedRefImpl {
    private dep: undefined | Set<ReactiveEffect>;
    private effect: ReactiveEffect;
    private __V_isRef = true;
    private _dirty = true;
    private _value = undefined;
    constructor(public getter: ComputedGetter, public setter: ComputedSetter) {
        // 这里不能使用effect(() => {})
        this.effect = new ReactiveEffect(this.getter, () => {
            this._dirty = true; // 依赖更新了， dirty置为true
            triggerEffect(this.dep); // 触发更新
        });
    }
    get value() {
        if (activeEffect) {
            // 如果有activeEffect， 说明计算属性是在effect中使用的
            // 需要让计算属性收集这个effect
            // 用户取值发生依赖收集
            trackEffect(this.dep || (this.dep = new Set()));
        }

        // 取值才执行， 并且把去到的值存储起来
        if (this._dirty) {
            this._value = this.effect.run();
            this._dirty = false; // 取值完成了， dirty置为false
        }
        return this._value;
    }
    set(newValue) {
        this.setter(newValue); // 这里直接调用setter即可
    }
}

const noop = () => {};
export function computed(getterOrOptions: ComputedOptions | ComputedGetter) {
    let onlyGetter = isFunction(getterOrOptions);

    let getter: ComputedGetter;
    let setter: ComputedSetter;

    if (onlyGetter) {
        getter = getterOrOptions as ComputedGetter;
        setter = noop;
    } else {
        getter = (getterOrOptions as ComputedOptions).get;
        setter = (getterOrOptions as ComputedOptions).set || noop;
    }

    return new ComputedRefImpl(getter, setter);
}
