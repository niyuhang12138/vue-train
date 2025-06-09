// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isFunction(value) {
  return typeof value === "function";
}
var ownProperty = Object.hasOwn;
var isArray = Array.isArray;

// packages/reactivity/src/effect.ts
var activeEffect = void 0;
function preCleanEffect(effect2) {
  effect2._depLength = 0;
  effect2._trackId++;
}
function postCleanEffect(effect2) {
  if (effect2.deps.length > effect2._depLength) {
    for (let i = effect2._depLength; i < effect2.deps.length; i++) {
      const dep = effect2.deps[i];
      cleanDepEffect(dep, effect2);
    }
    effect2.deps.length = effect2._depLength;
  }
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    // 用于记录当前effect的执行次数
    this.active = true;
    // 用于标识当前的effect是否处于激活状态
    this._running = 0;
    // 用于标识当前的effect是否正在执行
    this._dirtyLevel = 4 /* Dirty */;
    this._depLength = 0;
    // 用于记录当前effect的依赖关系的长度
    this.deps = [];
  }
  get dirty() {
    return this._dirtyLevel === 4 /* Dirty */;
  }
  set dirty(value) {
    this._dirtyLevel = value ? 4 /* Dirty */ : 0 /* NoDirty */;
  }
  run() {
    this.dirty = false;
    if (!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanEffect(this);
      activeEffect = lastEffect;
    }
  }
  stop() {
    if (this.active) {
      preCleanEffect(this);
      this.active = false;
      postCleanEffect(this);
    }
  }
};
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
  if (options) {
    Object.assign(_effect, options);
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

// packages/reactivity/src/reactiveEffect.ts
var createDep = (cleanup, key) => {
  const dep = /* @__PURE__ */ new Map();
  dep.cleanup = cleanup;
  dep.name = key;
  return dep;
};
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!activeEffect) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(
      key,
      dep = createDep(() => {
        depsMap.delete(key);
      }, key)
    );
  }
  trackEffect(activeEffect, dep);
}
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size === 0) {
    dep.cleanup();
  }
}
function trackEffect(effect2, dep) {
  if (dep.get(effect2) !== effect2._trackId) {
    dep.set(effect2, effect2._trackId);
    let oldDep = effect2.deps[effect2._depLength];
    console.log(oldDep, dep);
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect2);
      }
      effect2.deps[effect2._depLength++] = dep;
    } else {
      effect2._depLength++;
    }
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (!dep) return;
  triggerEffect(dep);
}
function triggerEffect(dep) {
  for (const effect2 of dep.keys()) {
    if (effect2._dirtyLevel < 4 /* Dirty */) {
      effect2.dirty = true;
    }
    if (!effect2._running) {
      if (effect2.scheduler) {
        effect2.scheduler();
      }
    }
  }
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return createRef(value);
}
function createRef(value) {
  return new RefImpl(value);
}
var _a;
_a = "__v_isRef" /* IS_REF */;
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this[_a] = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = newValue;
      this.rawValue = newValue;
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (!activeEffect) return;
  let dep = ref2.dep;
  if (!dep) {
    dep = ref2.dep = createDep((key) => {
      ref2.dep = void 0;
    }, "undefined");
  }
  trackEffect(activeEffect, dep);
}
function triggerRefValue(ref2) {
  let dep = ref2.dep;
  if (!dep) return;
  triggerEffect(dep);
}
var _a2;
_a2 = "__v_isRef" /* IS_REF */;
var ObjectRefImpl = class {
  // 标识是ref对象
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this[_a2] = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(target, key) {
  return new ObjectRefImpl(target, key);
}
function toRefs(object) {
  const ret = {};
  for (const key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      const r = Reflect.get(target, key, receiver);
      return r && isRef(r) ? r.value : r;
    },
    set(target, key, value, receiver) {
      const r = Reflect.get(target, key, receiver);
      if (r && isRef(r)) {
        r.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}
function isRef(value) {
  return !!(value && value["__v_isRef" /* IS_REF */]);
}

// packages/reactivity/src/baseHandlers.ts
var mutableHandlers = {
  // 用户取值操作
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    } else if (key === "__v_raw" /* RAW */) {
      return target;
    }
    track(target, key);
    let r = Reflect.get(target, key, receiver);
    if (isRef(r)) {
      return r.value;
    }
    if (isObject(r)) {
      return reactive(r);
    }
    return r;
  },
  // 用户设置值操作
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return result;
  }
};

// packages/reactivity/src/reactive.ts
var reactiveMap2 = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  return createReactiveObject(target, mutableHandlers, reactiveMap2);
}
function createReactiveObject(target, baseHandlers, proxyMap) {
  if (!isObject(target)) {
    return target;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const existsProxy = proxyMap.get(target);
  if (existsProxy) {
    return existsProxy;
  }
  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function toRaw2(observed) {
  const raw = observed && observed["__v_raw" /* RAW */];
  return raw ? raw : observed;
}
function isReactive(target) {
  return !!(target && target["__v_isReactive" /* IS_REACTIVE */]);
}

// packages/reactivity/src/computed.ts
var _a3;
_a3 = "__v_isRef" /* IS_REF */;
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this.setter = setter;
    this[_a3] = true;
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        triggerRefValue(this);
      }
    );
  }
  get value() {
    if (this.effect.dirty) {
      this._value = this.effect.run();
      trackRefValue(this);
    }
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
};
function computed(getterOrOptions) {
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = () => {
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set ?? (() => {
    });
  }
  return new ComputedRefImpl(getter, setter);
}

// packages/reactivity/src/watch.ts
function traverse(source, depth, currentDepth = 0, seen = /* @__PURE__ */ new Set()) {
  if (!isObject(source)) {
    return source;
  }
  if (depth) {
    if (currentDepth >= depth) {
      return source;
    }
  }
  currentDepth++;
  if (seen.has(source)) {
    return source;
  }
  seen.add(source);
  for (const key in source) {
    const value = source[key];
    return traverse(value, depth, currentDepth, seen);
  }
}
function doWatch(source, cb, options) {
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source, options?.deep === false ? 1 : void 0);
  } else if (isRef(source)) {
    getter = () => source.value;
  } else if (isFunction(source)) {
    getter = source;
  }
  let oldValue;
  let clean = void 0;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = void 0;
    };
  };
  const job = () => {
    if (cb) {
      let newValue = effect2.run();
      if (clean) {
        clean();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  if (options?.immediate) {
    job();
  } else {
    oldValue = effect2.run();
  }
  const unwatch = () => effect2.stop();
  return unwatch;
}
function watch(source, cb, options) {
  return doWatch(source, cb, options);
}
function watchEffect(effect2, options) {
  doWatch(effect2, null, {
    ...options,
    immediate: true
  });
}

// packages/reactivity/src/effectScope.ts
var activeEffectScope = null;
var EffectScope = class {
  constructor(detached = false) {
    this.active = true;
    this.effects = [];
    this.parent = null;
    this.scopes = [];
    if (activeEffectScope && !detached) {
      activeEffectScope.scopes.push(this);
    }
  }
  run(fn) {
    if (this.active) {
      try {
        this.parent = activeEffectScope;
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = this.parent;
        this.parent = null;
      }
    }
  }
  stop() {
    if (this.active) {
      this.effects.forEach((effect2) => {
        effect2.stop();
      });
      this.active = false;
    }
    this.scopes.forEach((scope) => {
      scope.stop();
    });
  }
};
function recordEffectScope(effect2) {
  if (!(activeEffectScope && activeEffectScope.active)) {
    return;
  }
  activeEffectScope.effects.push(effect2);
}
function effectScope(detached = false) {
  return new EffectScope(detached);
}
export {
  ComputedRefImpl,
  EffectScope,
  ObjectRefImpl,
  ReactiveEffect,
  RefImpl,
  activeEffect,
  activeEffectScope,
  computed,
  effect,
  effectScope,
  isReactive,
  isRef,
  proxyRefs,
  reactive,
  reactiveMap2 as reactiveMap,
  recordEffectScope,
  ref,
  toRaw2 as toRaw,
  toReactive,
  toRef,
  toRefs,
  trackRefValue,
  traverse,
  triggerRefValue,
  watch,
  watchEffect
};
//# sourceMappingURL=reactivity.esm.js.map
