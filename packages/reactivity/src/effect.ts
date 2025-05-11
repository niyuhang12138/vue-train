import { recordEffectScope } from "./effectScope";

export let activeEffect: ReactiveEffect | null = null;

// 每次收集依赖之前都要清理一下之前的依赖关系
function cleanupEffect(effect: ReactiveEffect) {
    // 每次执行effect的时候， 先清理一下之前的依赖关系
    let deps = effect.deps;

    let dep: Set<ReactiveEffect>;
    while ((dep = deps.pop())) {
        dep.delete(effect); // 删除当前的effect
    }
}

export class ReactiveEffect {
    public active = true;
    public deps: Array<Set<ReactiveEffect>> = [];
    public parent: ReactiveEffect | null = null;
    constructor(public fn, public scheduler?: Function) {
        recordEffectScope(this); // 记录当前的effect
    }

    run() {
        if (!this.active) {
            return this.fn(); // 执行执行此函数
        }
        // 其他情况下， 意味着是激活状态
        try {
            // 树的父子关系
            this.parent = activeEffect;
            activeEffect = this; // 让当前的effect成为activeEffect
            cleanupEffect(this);
            return this.fn(); // 这个地方做了依赖收集
        } finally {
            // 无论任何情况都会执行的
            activeEffect = this.parent;
            this.parent = null;
        }
    }

    stop() {
        if (this.active) {
            cleanupEffect(this); // 清理依赖关系
            this.active = false; // 停止收集依赖
        }
    }
}

// 依赖收集，就是将当前的effect变成全局的， 稍后取值的时候就可以拿到这个全局的effect
export function effect(
    fn,
    options: {
        scheduler?: Function;
    } = {}
) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    _effect.run(); // 默认让响应式的effect执行一次

    const runner = _effect.run.bind(_effect); // 让runner的this指向_effect
    runner.effect = _effect; // 将_effect挂载到runner上. 这样可以在runner上获取到_effect的属性

    return runner; // 返回一个函数， 这个函数可以执行effect
}

let targetMap = new WeakMap(); // 记录依赖关系的映射表

export function trackEffect(dep: Set<ReactiveEffect>) {
    let shouldTrack = !dep.has(activeEffect);
    if (shouldTrack) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep); // 后续需要通过effect来清理的时候可以去使用

        // 一个属性对应着多个effect, 一个effect对应着多个属性
        // 属性和effect的关系是多对多的关系
    }
}

export function track(target, key) {
    if (!activeEffect) {
        // 取值操作没有发生在effect中
        return;
    }
    let depsMap = targetMap.get(target); // 取值操作
    if (!depsMap) {
        // weakMap的key只能是对象
        targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    trackEffect(dep); // 依赖收集
}

export function triggerEffect(dep: Set<ReactiveEffect> | undefined) {
    if (dep) {
        // 解决循环更新的问题
        const effects: Array<ReactiveEffect> = [...dep];

        effects.forEach((effect) => {
            if (activeEffect !== effect) {
                if (effect.scheduler) {
                    effect.scheduler();
                } else {
                    effect.run();
                }
            }
        });
    }
}

// 触发更新
export function trigger(target, key, newValue, oldValue) {
    // weakMap {obj: map{ key: effect } }
    const depsMap = targetMap.get(target);

    if (!depsMap) return; // 没有依赖关系

    const dep = depsMap.get(key); // 取出对应的effect
    if (!dep) return; // 没有依赖关系
    triggerEffect(dep); // 触发更新
}
