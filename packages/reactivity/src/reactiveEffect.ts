import { DirtyLevels } from "./constants";
import { activeEffect, ReactiveEffect } from "./effect";
import { Target } from "./reactive";

export type Dep = Map<ReactiveEffect, number> & {
    cleanup: Function; // 清理函数
    name?: string | symbol; // 自定义名称
};

export const createDep = (cleanup: Function, key: string | symbol): Dep => {
    const dep = new Map() as Dep;
    dep.cleanup = cleanup; // 清理函数
    dep.name = key; // 自定义名称，为了标识这个映射表为那个属性服务
    return dep;
};

let targetMap = new WeakMap<Target, Map<string | symbol, Dep>>(); // 记录依赖关系的映射表

export function track(target: Target, key: string | symbol) {
    if (!activeEffect) {
        // 取值操作没有发生在effect中
        return;
    }

    // 获取该对象的依赖关系映射
    let depsMap = targetMap.get(target); // 取值操作

    if (!depsMap) {
        // 新增的
        targetMap.set(target, (depsMap = new Map()));
    }

    // 获取该对象触发属性的依赖关系
    let dep = depsMap.get(key);

    if (!dep) {
        depsMap.set(
            key,
            (dep = createDep(() => {
                depsMap.delete(key);
            }, key))
        );
    }

    trackEffect(activeEffect, dep); // 依赖收集
}

export function cleanDepEffect(dep: Dep, effect: ReactiveEffect) {
    // 清理依赖关系
    dep.delete(effect); // 删除当前的依赖关系
    if (dep.size === 0) {
        // 如果没有依赖关系了， 就清理掉这个依赖关系
        (dep as any).cleanup(); // 清理函数
    }
}

export function trackEffect(effect: ReactiveEffect, dep: Dep) {
    // 需要重新的去收集，将不需要的移除掉
    // 这里判断trackId是因为如果一个effect中触发了同一个的属性的多次依赖收集在这里只收集一次
    if (dep.get(effect) !== effect._trackId) {
        // 说明是新的依赖关系
        dep.set(effect, effect._trackId); // 记录当前的依赖关系

        // 如果之前有依赖关系，则需要清理掉之前的依赖关系
        let oldDep = effect.deps[effect._depLength];
        // 如果老的依赖关系和新的依赖关系不一样，说明是新的依赖关系，那就清理掉老的依赖关系
        if (oldDep !== dep) {
            if (oldDep) {
                // 删除调老的
                cleanDepEffect(oldDep, effect); // 清理掉老的依赖关系
            }
            effect.deps[effect._depLength++] = dep; // 记录当前的依赖关系
        }
        // 如果老的依赖关系和新的依赖关系一样，说明是同一个依赖关系，那就不需要再记录了
        else {
            effect._depLength++;
        }
    }
}

// 触发更新
export function trigger(
    target: Target,
    key: string | symbol,
    newValue: unknown,
    oldValue: unknown
) {
    const depsMap = targetMap.get(target);

    if (!depsMap) return; // 没有依赖关系

    const dep = depsMap.get(key); // 取出对应的effect

    if (!dep) return; // 没有依赖关系
    triggerEffect(dep); // 触发更新
}

export function triggerEffect(dep: Dep) {
    for (const effect of dep.keys()) {
        // 如果effect现在是不脏的，那么现在需要更新，则将其设置为脏
        if (effect._dirtyLevel < DirtyLevels.Dirty) {
            effect.dirty = true; // 设置为脏, 告诉其我更新了
        }

        // 判断effect是否正在运行，如果是在effect中修改了值， 则不需要再次执行
        if (!effect._running) {
            if (effect.scheduler) {
                effect.scheduler(); // 调度器
            }
        }
    }
}
