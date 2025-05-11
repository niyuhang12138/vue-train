// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isFunction(value) {
  return typeof value === "function";
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
      this.effects.forEach((effect3) => {
        effect3.stop();
      });
      this.active = false;
    }
    this.scopes.forEach((scope) => {
      scope.stop();
    });
  }
};
function recordEffectScope(effect3) {
  if (!(activeEffectScope && activeEffectScope.active)) {
    return;
  }
  activeEffectScope.effects.push(effect3);
}
function effectScope(detached = false) {
  return new EffectScope(detached);
}

// packages/reactivity/src/effect.ts
var activeEffect = null;
function cleanupEffect(effect3) {
  let deps = effect3.deps;
  let dep;
  while (dep = deps.pop()) {
    dep.delete(effect3);
  }
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.active = true;
    this.deps = [];
    this.parent = null;
    recordEffectScope(this);
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    try {
      this.parent = activeEffect;
      activeEffect = this;
      cleanupEffect(this);
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);
      this.active = false;
    }
  }
};
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run();
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var targetMap = /* @__PURE__ */ new WeakMap();
function trackEffect(dep) {
  let shouldTrack = !dep.has(activeEffect);
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
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
    depsMap.set(key, dep = /* @__PURE__ */ new Set());
  }
  trackEffect(dep);
}
function triggerEffect(dep) {
  if (dep) {
    const effects = [...dep];
    effects.forEach((effect3) => {
      if (activeEffect !== effect3) {
        if (effect3.scheduler) {
          effect3.scheduler();
        } else {
          effect3.run();
        }
      }
    });
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (!dep) return;
  triggerEffect(dep);
}

// packages/reactivity/src/baseHandlers.ts
var mutableHandlers = {
  // 用户取值操作
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    let r = Reflect.get(target, key, receiver);
    if (isObject(r)) {
      return reactive(r);
    }
    return r;
  },
  // 用户设置值操作
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let r = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return r;
  }
};

// packages/reactivity/src/reactive.ts
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
  return ReactiveFlags2;
})(ReactiveFlags || {});
function isReactive(target) {
  return !!(target && target["__v_isReactive" /* IS_REACTIVE */]);
}
var reactiveMap = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  if (!isObject(target)) {
    return target;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const existsProxy = reactiveMap.get(target);
  if (existsProxy) {
    return existsProxy;
  }
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this.getter = getter;
    this.setter = setter;
    this.__V_isRef = true;
    this._dirty = true;
    this._value = void 0;
    this.effect = new ReactiveEffect(this.getter, () => {
      this._dirty = true;
      triggerEffect(this.dep);
    });
  }
  get value() {
    if (activeEffect) {
      trackEffect(this.dep || (this.dep = /* @__PURE__ */ new Set()));
    }
    if (this._dirty) {
      this._value = this.effect.run();
      this._dirty = false;
    }
    return this._value;
  }
  set(newValue) {
    this.setter(newValue);
  }
};
var noop = () => {
};
function computed(getterOrOptions) {
  let onlyGetter = isFunction(getterOrOptions);
  let getter;
  let setter;
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = noop;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set || noop;
  }
  return new ComputedRefImpl(getter, setter);
}

// packages/reactivity/src/watch.ts
function traverse(source, s = /* @__PURE__ */ new Set()) {
  if (!isObject(source)) {
    return source;
  }
  if (s.has(source)) {
    return source;
  }
  s.add(source);
  for (const key in source) {
    const value = source[key];
    traverse(value, s);
  }
}
function doWatch(source, cb, options) {
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source);
  } else if (isFunction(source)) {
    getter = source;
  }
  let oldValue;
  let cleanup;
  const onCleanup = (cb2) => {
    cleanup = cb2;
  };
  const job = () => {
    if (cb) {
      let newValue = effect3.run();
      if (cleanup) {
        cleanup();
      }
      cb(newValue, oldValue);
      oldValue = newValue;
    } else {
      effect3.run();
    }
  };
  const effect3 = new ReactiveEffect(getter, job);
  if (options?.immediate) {
    return job();
  }
  oldValue = effect3.run();
}
function watch(source, cb, options) {
  return doWatch(source, cb, options);
}
function watchEffect(effect3, options) {
  doWatch(effect3, null, {
    immediate: true,
    ...options
  });
}

// packages/reactivity/src/ref.ts
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.deps = void 0;
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    if (activeEffect) {
      trackEffect(this.deps || (this.deps = /* @__PURE__ */ new Set()));
    }
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = toReactive(newValue);
      this.rawValue = newValue;
      triggerEffect(this.deps);
    }
  }
};
function ref(value) {
  return new RefImpl(value);
}
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
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
function proxyRefs(objectWithRefs) {
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
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}
export {
  EffectScope,
  ObjectRefImpl,
  ReactiveEffect,
  ReactiveFlags,
  RefImpl,
  activeEffect,
  activeEffectScope,
  computed,
  effect,
  effectScope,
  isReactive,
  proxyRefs,
  reactive,
  recordEffectScope,
  ref,
  toRef,
  toRefs,
  track,
  trackEffect,
  traverse,
  trigger,
  triggerEffect,
  watch,
  watchEffect
};
//# sourceMappingURL=reactivity.esm.js.map
