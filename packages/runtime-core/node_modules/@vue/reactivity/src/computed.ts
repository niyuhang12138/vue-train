import { ReactiveEffect } from "./effect";
import { isFunction } from "@vue/shared";
import { trackRefValue, triggerRefValue } from "./ref";
import { Dep } from "./reactiveEffect";
import { ReactiveFlags } from "./constants";

interface ComputedOptions {
    get: (oldValue: any) => any;
    set: (newValue: any) => void;
}

export class ComputedRefImpl {
    public [ReactiveFlags.IS_REF] = true; // 标识是ref对象
    public _value: unknown; // 用来保存计算属性的值
    public effect: ReactiveEffect;
    public dep: Dep;

    constructor(
        getter: ComputedOptions["get"],
        public setter: ComputedOptions["set"]
    ) {
        // 我们需要创建一个effect 来管理这个getter
        this.effect = new ReactiveEffect(
            () => getter(this._value),
            () => {
                // 计算属性的值发生变化了， 我们应该触发渲染effect重新执行
                triggerRefValue(this);
            }
        );
    }

    get value() {
        // 依赖收集
        if (this.effect.dirty) {
            this._value = this.effect.run();

            // 如果当前在effect中访问了计算属性，计算属性是可以收集这个effect的
            trackRefValue(this);
        }
        return this._value;
    }

    set value(newValue) {
        // 计算属性是只读的， 如果用户设置了值， 我们就执行setter
        this.setter(newValue);
    }
}

export function computed(
    getterOrOptions: ComputedOptions["get"] | ComputedOptions
) {
    let getter: ComputedOptions["get"];
    let setter: ComputedOptions["set"];
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions as ComputedOptions["get"];
        setter = () => {};
    } else {
        getter = (getterOrOptions as ComputedOptions).get;
        setter = (getterOrOptions as ComputedOptions).set ?? (() => {});
    }

    return new ComputedRefImpl(getter, setter);
}
