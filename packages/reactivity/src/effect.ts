import { DirtyLevels } from "./constants";
import { recordEffectScope } from "./effectScope";
import { cleanDepEffect, Dep } from "./reactiveEffect";

export let activeEffect: ReactiveEffect | undefined = void 0; // 当前正在执行的effect

// 每次收集依赖之前都要清理一下之前的依赖关系
function preCleanEffect(effect: ReactiveEffect) {
    effect._depLength = 0; // 重置依赖关系的长度
    effect._trackId++; // 每次执行id+1, 如果当期同一个effect执行， id就是相同的
}

function postCleanEffect(effect: ReactiveEffect) {
    if (effect.deps.length > effect._depLength) {
        for (let i = effect._depLength; i < effect.deps.length; i++) {
            const dep = effect.deps[i]; // 取出依赖关系
            cleanDepEffect(dep, effect); // 清理依赖关系
        }
        effect.deps.length = effect._depLength; // 重置依赖关系的长度
    }
}

export class ReactiveEffect {
    public _trackId: number = 0; // 用于记录当前effect的执行次数
    public active = true; // 用于标识当前的effect是否处于激活状态
    public _running = 0; // 用于标识当前的effect是否正在执行
    public _dirtyLevel = DirtyLevels.Dirty;
    public _depLength = 0; // 用于记录当前effect的依赖关系的长度
    public deps: Array<Dep> = [];

    constructor(public fn: Function, public scheduler?: Function) {
        // recordEffectScope(this); // 记录当前的effect
    }

    public get dirty() {
        return this._dirtyLevel === DirtyLevels.Dirty;
    }

    public set dirty(value: boolean) {
        this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NoDirty;
    }

    run() {
        this.dirty = false; // 每次运行后此值就不脏了

        if (!this.active) {
            return this.fn(); // 执行执行此函数
        }
        // 其他情况下， 意味着是激活状态
        let lastEffect = activeEffect;

        try {
            // 树的父子关系
            activeEffect = this; // 让当前的effect成为activeEffect
            // effect重新执行之前， 先清理一下之前的依赖关系
            preCleanEffect(this);
            this._running++;
            return this.fn(); // 这个地方做了依赖收集
        } finally {
            this._running--;
            postCleanEffect(this); // 清理依赖关系
            // 无论任何情况都会执行的
            activeEffect = lastEffect;
        }
    }

    stop() {
        if (this.active) {
            preCleanEffect(this); // 清理依赖关系
            this.active = false; // 停止收集依赖
            postCleanEffect(this); // 清理依赖关系
        }
    }
}

/**
 * effect 函数用于创建一个响应式的effect
 * @param fn fn函数执行的时候会收集依赖
 * @param options options可选参数， 可以传入一些配置向
 * @returns
 */
export function effect(fn: Function, options?: Partial<ReactiveEffect>) {
    const _effect = new ReactiveEffect(fn, () => {
        _effect.run();
    });

    _effect.run(); // 默认让响应式的effect执行一次

    // 如果传递了options， 则将其合并到_effect上
    if (options) {
        Object.assign(_effect, options);
    }

    // effect函数返回runner函数， 这个函数可以执行effect的run方法
    const runner = _effect.run.bind(_effect); // 让runner的this指向_effect

    runner.effect = _effect; // 将_effect挂载到runner上. 这样可以在runner上获取到_effect的属

    return runner; // 返回一个函数， 这个函数可以执行effect
}
