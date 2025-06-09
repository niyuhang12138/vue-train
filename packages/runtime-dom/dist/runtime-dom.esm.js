// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isFunction(value) {
  return typeof value === "function";
}
function isString(value) {
  return typeof value === "string";
}
var ownProperty = Object.hasOwn;
var isArray = Array.isArray;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var hasOwn = (value, key) => hasOwnProperty.call(value, key);
var extend = Object.assign;

// packages/runtime-dom/src/nodeOps.ts
var doc = document;
var nodeOps = {
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor);
  },
  remove(child) {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement(type) {
    return doc.createElement(type);
  },
  createText(text) {
    return doc.createTextNode(text);
  },
  createComment(common) {
    return doc.createComment(common);
  },
  setText(node, text) {
    node.nodeValue = text;
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  parentNode(node) {
    return node.parentNode;
  },
  nextSibling(node) {
    return node.nextSibling;
  },
  querySelector(selector) {
    return doc.querySelector(selector);
  },
  cloneNode(node) {
    return node.cloneNode(true);
  }
};

// packages/runtime-dom/src/modules/patchClass.ts
function patchClass(el, value) {
  if (value) el.className = value;
  else el.removeAttribute("class");
}

// packages/runtime-dom/src/modules/patchEvent.ts
function createInvoker(value) {
  const invoker = (e) => invoker.value(e);
  invoker.value = value;
  return invoker;
}
function patchEvent(el, key, nextValue) {
  const eventName = key.slice(2).toLowerCase();
  const invokes = el._vei || (el._vei = {});
  const existingInvoker = invokes[eventName];
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
    return;
  }
  if (nextValue) {
    const invoker = invokes[eventName] = createInvoker(nextValue);
    el.addEventListener(eventName, invoker);
    return;
  }
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker);
    invokes[eventName] = void 0;
  }
}

// packages/runtime-dom/src/modules/patchProp.ts
var excludedKeys = ["ref"];
function patchAttr(el, key, value) {
  if (excludedKeys.includes(key)) return;
  if (value) {
    el.setAttribute(key, value);
  } else {
    el.removeAttribute(key);
  }
}

// packages/runtime-dom/src/modules/patchStyle.ts
function patchStyle(el, prevValue, nextValue) {
  let style = el.style;
  if (nextValue)
    for (const key in nextValue) {
      style[key] = nextValue[key];
    }
  if (prevValue)
    for (const key in prevValue) {
      if (nextValue && !(key in nextValue)) style[key] = null;
    }
}

// packages/runtime-dom/src/patchProp.ts
var patchProps = (el, key, prevValue, nextValue) => {
  if (key === "class") patchClass(el, nextValue);
  else if (key === "style") patchStyle(el, prevValue, nextValue);
  else if (/^on[^a-z]/.test(key)) return patchEvent(el, key, nextValue);
  else return patchAttr(el, key, nextValue);
};
var patchProp_default = patchProps;

// packages/runtime-core/src/components/Teleport.ts
var Teleport = {
  __isTeleport: true,
  process(preVNode, nextVNode, container, anchor, parentComponent, internals) {
    const { mountChildren, patchChildren, move } = internals;
    if (!preVNode) {
      const target = nextVNode.target = document.querySelector(
        nextVNode.props?.to
      );
      if (target) {
        mountChildren(
          nextVNode.children,
          target,
          parentComponent
        );
      } else {
        console.warn(
          `Teleport target "${nextVNode.props?.to}" not found.`
        );
      }
    } else {
      patchChildren(
        preVNode,
        nextVNode,
        nextVNode.target,
        anchor,
        parentComponent
      );
      if (nextVNode.props?.to !== preVNode.props?.to) {
        const nextTarget = nextVNode.target = document.querySelector(
          nextVNode.props?.to
        );
        nextVNode.children.forEach((child) => {
          move(child, nextTarget, anchor);
        });
      }
    }
  },
  remove(vNode, unmountChildren) {
    const { shapeFlag } = vNode;
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      unmountChildren(vNode.children);
    }
  }
};
function isTeleport(value) {
  return value && value?.__isTeleport;
}

// packages/runtime-core/src/components/Transition.ts
function nextFrame(fn) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
function resolveTransitionProps(props) {
  const {
    name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave
  } = props;
  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el);
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };
      onEnter && onEnter(el, resolve);
      nextFrame(() => {
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener("transitionend", resolve);
        }
      });
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(leaveActiveClass);
        el.classList.remove(leaveToClass);
        done && done();
      };
      el.classList.add(leaveActiveClass);
      el.classList.add(leaveFromClass);
      document.body.offsetHeight;
      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);
        if (!onLeave || onEnter.length <= 1) {
          el.addEventListener("transitionend", resolve);
        }
      });
      onLeave && onLeave(el, done);
    }
  };
}
function Transition(props, { slots }) {
  return h(BaseTransitionImpl, resolveTransitionProps(props), slots);
}
var BaseTransitionImpl = {
  // 真正的组件只需要渲染封装好的路街
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default();
      const instance = getCurrentInstance();
      if (!vnode) return;
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave
      };
      return vnode;
    };
  }
};

// packages/runtime-core/src/components/KeepAlive.ts
var KeepAlive = {
  __isKeepAlive: true,
  setup(props, { slots }) {
    const keys = /* @__PURE__ */ new Set();
    const cache = /* @__PURE__ */ new Map();
    return () => {
      const vnode = slots.default && slots.default();
      if (!vnode) return;
      const comp = vnode.type;
      const key = vnode.key ?? comp;
      return vnode;
    };
  }
};
var isKeepAlive = (val) => {
  return val && val.__isKeepAlive === true;
};

// packages/runtime-core/src/vnode.ts
var Text = Symbol("text");
var Fragment = Symbol("fragment");
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isTeleport(type) ? 64 /* TELEPORT */ : isObject(type) ? 6 /* COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    key: props?.key,
    shapeFlag
  };
  if (props?.ref) {
    vnode.ref = props.ref;
  }
  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
    } else if (isObject(children)) {
      vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
    } else {
      children = String(children);
      vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
    vnode.children = children;
  }
  return vnode;
}
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
function isSameVNode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  let l = arguments.length;
  if (l === 2) {
    if (isVNode(propsOrChildren)) {
      return createVNode(type, null, [propsOrChildren]);
    } else if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      return createVNode(type, propsOrChildren);
    } else {
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    }
    if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-core/src/seq.ts
function getSequence(arr) {
  const result = [0];
  const len = arr.length;
  let start;
  let end;
  let middle;
  const dp = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI === 0) continue;
    let lastIndex = result[result.length - 1];
    if (arr[lastIndex] < arrI) {
      dp[i] = result[result.length - 1];
      result.push(i);
      continue;
    }
    start = 0;
    end = result.length - 1;
    while (start < end) {
      middle = Math.floor((start + end) / 2);
      if (arr[result[middle]] < arrI) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }
    if (arrI < arr[result[start]]) {
      dp[i] = result[start - 1];
      result[start] = i;
    }
  }
  let l = result.length;
  let last = result[l - 1];
  while (l-- > 0) {
    result[l] = last;
    last = dp[last];
  }
  return result;
}

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

// packages/runtime-core/src/scheduler.ts
var queue = [];
var isFlushing = false;
var resolvePromise = Promise.resolve();
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      const copy = queue.slice(0);
      queue.length = 0;
      copy.forEach((job2) => job2());
      copy.length = 0;
    });
  }
}

// packages/runtime-core/src/component.ts
function createComponentInstance(vnode, parentComponent) {
  const type = vnode.type;
  const instance = {
    vNode: vnode,
    isMounted: false,
    propOptions: type.props,
    parent: parentComponent,
    provides: parentComponent ? parentComponent.provides : /* @__PURE__ */ Object.create(null),
    ctx: {}
  };
  return instance;
}
var initProps = (instance, rawProps = {}) => {
  const props = {};
  const attrs = {};
  const propOptions = instance.propOptions || {};
  for (const key in rawProps) {
    const value = rawProps[key];
    if (key in propOptions) {
      props[key] = value;
    } else {
      attrs[key] = value;
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
};
var initSlots = (instance, children) => {
  if (instance.vNode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    instance.slots = children;
  } else {
    instance.slots = {};
  }
};
var publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
  // ...
};
var handler = {
  get(target, key) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key];
    }
    const getter = publicProperty[key];
    if (getter) {
      return getter(target);
    }
  },
  // @ts-ignore
  set(target, key, value) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (props && hasOwn(props, key)) {
      console.warn("props is readonly");
      return false;
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value;
    }
    return true;
  }
};
function setupComponent(instance) {
  const { vNode } = instance;
  initProps(instance, vNode.props);
  initSlots(instance, vNode.children);
  instance.proxy = new Proxy(instance, handler);
  const { data = () => ({}), render: render2, setup } = vNode.type;
  if (setup) {
    const setupContext = {
      slots: instance.slots,
      attrs: instance.attrs,
      emit(event, ...payload) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        if (instance.vNode.props, hasOwn(instance.vNode.props, eventName)) {
          const handler2 = instance.vNode.props[eventName];
          if (isFunction(handler2)) {
            handler2(...payload);
          } else {
            console.warn(
              `Event handler for ${eventName} is not a function`
            );
          }
        }
      },
      expose(value) {
        instance.exposed = value;
      }
    };
    setCurrentInstance(instance);
    const setupRes = setup(instance.props, setupContext);
    unsetCurrentInstance();
    if (isFunction(setupRes)) {
      instance.render = setupRes;
    } else {
      instance.setupState = proxyRefs(setupRes);
    }
  }
  if (!isFunction(data)) return console.warn("data must be a function");
  instance.data = reactive(data.call(instance.proxy));
  if (!instance.render) {
    instance.render = render2;
  }
}
var currentInstance = null;
var getCurrentInstance = () => {
  return currentInstance;
};
var setCurrentInstance = (instance) => {
  currentInstance = instance;
};
var unsetCurrentInstance = () => {
  currentInstance = null;
};

// packages/runtime-core/src/apiLifecycle.ts
var LifeCycle = /* @__PURE__ */ ((LifeCycle2) => {
  LifeCycle2["BEFORE_MOUNT"] = "bm";
  LifeCycle2["MOUNTED"] = "m";
  LifeCycle2["BEFORE_UPDATE"] = "bu";
  LifeCycle2["UPDATED"] = "u";
  LifeCycle2["UNMOUNTED"] = "um";
  return LifeCycle2;
})(LifeCycle || {});
var createHook = (lifeCycle) => {
  return (hook, target = currentInstance) => {
    if (target) {
      const hooks = target[lifeCycle] || (target[lifeCycle] = []);
      const wrapHook = () => {
        setCurrentInstance(target);
        hook.call(target);
        unsetCurrentInstance();
      };
      hooks.push(wrapHook);
    }
  };
};
var onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
var onUpdated = createHook("u" /* UPDATED */);
var onUnmounted = createHook("um" /* UNMOUNTED */);
var invokeArray = (fns) => {
  fns.forEach((fn) => fn());
};

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    querySelector: hostQuerySelector,
    cloneNode: hostCloneNode,
    patchProp: hostPatchProp
  } = renderOptions;
  const normalize = (children) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (typeof child === "string" || typeof child === "number") {
        child = children[i] = createVNode(Text, null, String(child));
      }
    }
    return children;
  };
  const mountChildren = (children, container, anchor, parentComponent) => {
    normalize(children);
    children.forEach((child) => {
      patch(null, child, container, anchor, parentComponent);
    });
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(
        children,
        el,
        anchor,
        parentComponent
      );
    }
    if (transition) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if (transition) {
      transition.enter(el);
    }
  };
  const patchProps2 = (prevProps, nextProps, container) => {
    for (const key in nextProps) {
      hostPatchProp(container, key, prevProps[key], nextProps[key]);
    }
    for (const key in prevProps) {
      if (!(key in nextProps)) {
        hostPatchProp(container, key, prevProps[key], null);
      }
    }
  };
  const unmountChildren = (children) => {
    children.forEach((child) => {
      unmount(child);
    });
  };
  const patchKeyedChildren = (prevChildren, nextChildren, container) => {
    let i = 0;
    let e1 = prevChildren.length - 1;
    let e2 = nextChildren.length - 1;
    while (i <= e1 && i <= e2) {
      const prevVNode = prevChildren[i];
      const nextVNode = nextChildren[i];
      if (isSameVNode(prevVNode, nextVNode)) {
        patch(prevVNode, nextVNode, container);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const prevVNode = prevChildren[e1];
      const nextVNode = nextChildren[e2];
      if (isSameVNode(prevVNode, nextVNode)) {
        patch(prevVNode, nextVNode, container);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        let anchor = nextPos < nextChildren.length ? nextChildren[nextPos].el : void 0;
        while (i <= e2) {
          patch(null, nextChildren[i], container, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(prevChildren[i]);
          i++;
        }
      }
    } else {
      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      for (let i2 = s2; i2 <= e2; i2++) {
        const nextVNode = nextChildren[i2];
        keyToNewIndexMap.set(nextVNode.key, i2);
      }
      let toBePatched = e2 - s2 + 1;
      let newIndexToOldMapIndex = new Array(toBePatched).fill(0);
      for (let i2 = s1; i2 <= e1; i2++) {
        const prevVNode = prevChildren[i2];
        const newIndex = keyToNewIndexMap.get(prevVNode.key);
        if (newIndex === void 0) {
          unmount(prevVNode);
        } else {
          newIndexToOldMapIndex[newIndex - s2] = i2 + 1;
          patch(prevVNode, nextChildren[newIndex], container);
        }
      }
      const seq = getSequence(newIndexToOldMapIndex);
      let j = seq.length - 1;
      for (let i2 = toBePatched - 1; i2 >= 0; i2--) {
        let newIndex = s2 + i2;
        let anchor = newIndex + 1 < nextChildren.length ? nextChildren[newIndex + 1].el : null;
        const vNode = nextChildren[newIndex];
        if (i2 !== seq[j]) {
          hostInsert(vNode.el, container, anchor);
        } else {
          j--;
        }
      }
    }
  };
  const patchChildren = (prevVNode, nextVNode, container, anchor, parentComponent) => {
    const { el } = nextVNode;
    const c1 = prevVNode.children;
    const c2 = isArray(nextVNode.children) ? normalize(nextVNode.children) : nextVNode.children;
    const prevShapeFlag = prevVNode.shapeFlag;
    const nextShapeFlag = nextVNode.shapeFlag;
    if (nextShapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        if (nextShapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(
            c1,
            c2,
            el
          );
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(el, "");
        }
        if (nextShapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(
            c2,
            el,
            anchor,
            parentComponent
          );
        }
      }
    }
  };
  const patchElement = (prevVNode, nextVNode, container, anchor, parentComponent) => {
    let el = nextVNode.el = prevVNode.el;
    const prevProps = prevVNode.props || {};
    const nextProps = nextVNode.props || {};
    patchProps2(prevProps, nextProps, el);
    patchChildren(prevVNode, nextVNode, el, anchor, parentComponent);
  };
  const processElement = (prevVNode, nextVNode, container, anchor, parentComponent) => {
    if (!prevVNode) {
      mountElement(nextVNode, container, anchor, parentComponent);
    } else {
      patchElement(
        prevVNode,
        nextVNode,
        container,
        anchor,
        parentComponent
      );
    }
  };
  const processText = (prevVNode, nextVNode, container) => {
    if (!prevVNode) {
      hostInsert(
        nextVNode.el = hostCreateText(nextVNode.children),
        container
      );
    } else {
      nextVNode.el = prevVNode.el;
      if (nextVNode.children !== prevVNode.children) {
        hostSetText(nextVNode.el, nextVNode.children);
      }
    }
  };
  const processFragment = (prevVNode, nextVNode, container, anchor, parentComponent) => {
    if (!prevVNode) {
      mountChildren(
        nextVNode.children,
        container,
        anchor,
        parentComponent
      );
    } else {
      patchChildren(
        prevVNode,
        nextVNode,
        container,
        anchor,
        parentComponent
      );
    }
  };
  const updateComponentPreRender = (instance, next) => {
    instance.next = void 0;
    instance.vNode = next;
    updateProps(instance, instance.props, next.props);
    Object.assign(instance.slots, next.children || {});
  };
  function renderComponent(instance) {
    const { render: render3, vNode, proxy, attrs, slots } = instance;
    if (vNode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      return render3.call(proxy, proxy);
    } else {
      return vNode.type(attrs || {}, {
        slots
      });
    }
  }
  const setupRenderEffect = (instance, container, anchor) => {
    const componentUpdateFn = () => {
      const { bm, m } = instance;
      if (!instance.isMounted) {
        if (bm) {
          invokeArray(bm);
        }
        const subTree = renderComponent(instance);
        patch(null, subTree, container, anchor, instance);
        instance.subTree = subTree;
        instance.isMounted = true;
        if (m) {
          invokeArray(m);
        }
      } else {
        const { next, bu, u } = instance;
        if (next) {
          updateComponentPreRender(instance, next);
        }
        if (bu) {
          invokeArray(bu);
        }
        const subTree = renderComponent(instance);
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArray(u);
        }
      }
    };
    const update = instance.update = () => {
      effect2.run();
    };
    const effect2 = new ReactiveEffect(
      componentUpdateFn,
      () => queueJob(update)
    );
    update();
  };
  const mountComponent = (nextVNode, container, anchor, parentComponent) => {
    const instance = nextVNode.component = createComponentInstance(
      nextVNode,
      parentComponent
    );
    if (isKeepAlive(nextVNode.type)) {
      debugger;
      instance.ctx.renderer = {
        createElement: hostCreateElement,
        // 内部需要创建一个div来缓存dom
        move(vnode, container2) {
          hostInsert(vnode.component.subTree.el, container2);
        },
        unmount
        // 如果组件切换需要将现在容器中的元素移除
      };
    }
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor);
  };
  const hasPropsChange = (prevProps, nextProps) => {
    if (Object.keys(prevProps).length !== Object.keys(nextProps).length) {
      return true;
    }
    for (const key in nextProps) {
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  };
  const updateProps = (instance, prevProps, nextProps) => {
    if (hasPropsChange(prevProps, nextProps)) {
      for (const key in nextProps) {
        instance.props[key] = nextProps[key];
      }
      for (const key in instance.props) {
        if (!(key in nextProps)) {
          delete instance.props[key];
        }
      }
    }
  };
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;
    if (prevChildren || nextChildren) return true;
    if (prevProps === nextProps) return false;
    return hasPropsChange(prevProps || {}, nextProps || {});
  };
  const updateComponent = (prevVNode, nextVNode) => {
    const instance = nextVNode.component = prevVNode.component;
    if (shouldComponentUpdate(prevVNode, nextVNode)) {
      instance.next = nextVNode;
      instance.update();
    }
  };
  const processComponent = (prevVNode, nextVNode, container, anchor, parentComponent) => {
    if (!prevVNode) {
      mountComponent(nextVNode, container, anchor, parentComponent);
    } else {
      updateComponent(prevVNode, nextVNode);
    }
  };
  const patch = (prevVNode, nextVNode, container, anchor, parentComponent) => {
    if (prevVNode === nextVNode) {
      return;
    }
    if (prevVNode && !isSameVNode(prevVNode, nextVNode)) {
      unmount(prevVNode);
      prevVNode = null;
    }
    const { type, shapeFlag, ref: ref2 } = nextVNode;
    switch (type) {
      case Text:
        processText(prevVNode, nextVNode, container);
        break;
      case Fragment:
        processFragment(
          prevVNode,
          nextVNode,
          container,
          anchor,
          parentComponent
        );
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(
            prevVNode,
            nextVNode,
            container,
            anchor,
            parentComponent
          );
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(
            prevVNode,
            nextVNode,
            container,
            anchor,
            parentComponent
          );
        } else if (shapeFlag & 64 /* TELEPORT */) {
          type.process(
            prevVNode,
            nextVNode,
            container,
            anchor,
            parentComponent,
            {
              mountChildren,
              patchChildren,
              move(vnode, container2, anchor2) {
                hostInsert(
                  vnode.component ? vnode.component.subTree.el : vnode.el,
                  container2,
                  anchor2
                );
              }
            }
          );
        }
        break;
    }
    if (ref2) {
      setRef(ref2, nextVNode);
    }
  };
  const setRef = (ref2, vnode) => {
    const value = vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */ ? vnode.component.exposed || vnode.component.proxy : vnode.el;
    if (isRef(ref2)) {
      ref2.value = value;
    }
  };
  const unmount = (vnode) => {
    const preformRemove = () => hostRemove(vnode.el);
    if (vnode.type === Fragment) {
      unmountChildren(vnode.children);
    } else if (vnode.shapeFlag & 6 /* COMPONENT */) {
      const um = vnode.component.um;
      if (um) {
        invokeArray(um);
      }
      unmount(vnode.component.subTree);
    } else if (vnode.shapeFlag & 64 /* TELEPORT */) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      const { el } = vnode;
      if (el) {
        if (vnode.transition) {
          vnode.transition.leave(vnode.el, preformRemove);
        } else {
          preformRemove();
        }
      }
    }
  };
  const render2 = (vnode, container) => {
    if (vnode === null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/apiProvide.ts
function provide(key, value) {
  if (!currentInstance) {
    console.warn(
      "provide() can only be used inside setup() or lifecycle hooks."
    );
    return;
  }
  const parentProvides = currentInstance.parent?.provides;
  let provides = currentInstance.provides;
  if (parentProvides === provide) {
    provides = currentInstance.provides = Object.create(parentProvides);
  }
  provides[key] = value;
}
function inject(key) {
  if (!currentInstance) {
    console.warn(
      "inject() can only be used inside setup() or lifecycle hooks."
    );
    return;
  }
  const parentProvides = currentInstance.parent?.provides;
  if (parentProvides && hasOwn(parentProvides, key)) {
    return parentProvides[key];
  }
}

// packages/runtime-dom/src/index.ts
var domRenderOptions = extend(
  { patchProp: patchProp_default },
  nodeOps
);
var render = (vnode, container) => {
  return createRenderer(domRenderOptions).render(vnode, container);
};
export {
  ComputedRefImpl,
  EffectScope,
  Fragment,
  KeepAlive,
  LifeCycle,
  ObjectRefImpl,
  ReactiveEffect,
  RefImpl,
  Teleport,
  Text,
  Transition,
  activeEffect,
  activeEffectScope,
  computed,
  createComponentInstance,
  createRenderer,
  createVNode,
  currentInstance,
  domRenderOptions,
  effect,
  effectScope,
  getCurrentInstance,
  h,
  inject,
  invokeArray,
  isKeepAlive,
  isReactive,
  isRef,
  isSameVNode,
  isTeleport,
  isVNode,
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  proxyRefs,
  reactive,
  reactiveMap2 as reactiveMap,
  recordEffectScope,
  ref,
  render,
  resolveTransitionProps,
  setCurrentInstance,
  setupComponent,
  toRaw2 as toRaw,
  toReactive,
  toRef,
  toRefs,
  trackRefValue,
  traverse,
  triggerRefValue,
  unsetCurrentInstance,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.esm.js.map
