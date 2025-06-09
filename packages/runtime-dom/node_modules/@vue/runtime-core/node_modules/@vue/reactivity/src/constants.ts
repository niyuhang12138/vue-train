export enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
    IS_REF = "__v_isRef",
    RAW = "__v_raw", // 可以通过这个标志访问到原始对象
}

export enum DirtyLevels {
    Dirty = 4, // 脏值，意味着取值要运行计算属性
    NoDirty = 0, // 没有脏值，意味着取值不需要运行计算属性
}
