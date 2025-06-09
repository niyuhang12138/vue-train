import { proxyRefs, reactive } from "@vue/reactivity";
import {
    Component,
    Instance,
    ParentComponent,
    SetupContext,
    VNode,
} from "./vnode";
import { hasOwn, isFunction, ShapeFlags } from "@vue/shared";

export function createComponentInstance(
    vnode: VNode,
    parentComponent?: ParentComponent
) {
    const type = vnode.type as Component;
    const instance: Instance = {
        vNode: vnode,
        isMounted: false,
        propOptions: type.props,
        parent: parentComponent,
        provides: parentComponent
            ? (parentComponent as Instance).provides
            : Object.create(null),
        ctx: {},
    };

    return instance;
}

const initProps = (instance: Instance, rawProps: Record<string, any> = {}) => {
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

const initSlots = (instance: Instance, children: VNode["children"]) => {
    if (instance.vNode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        instance.slots = children as Record<string, () => VNode>;
    } else {
        instance.slots = {};
    }
};

const publicProperty = {
    $attrs: (instance: Instance) => instance.attrs,
    $slots: (instance: Instance) => instance.slots,
    // ...
};

const handler = {
    get(target, key) {
        const { data, props, setupState } = target as Instance;

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

        // 对于一些无法修改的属性
    },
    // @ts-ignore
    set(target, key, value) {
        const { data, props, setupState } = target as Instance;

        if (data && hasOwn(data, key)) {
            // @ts-ignore
            data[key] = value;
        } else if (props && hasOwn(props, key)) {
            console.warn("props is readonly");
            return false; // props是只读的
        } else if (setupState && hasOwn(setupState, key)) {
            setupState[key] = value;
        }

        return true;
    },
};

export function setupComponent(instance: Instance) {
    const { vNode } = instance;

    initProps(instance, vNode.props);
    initSlots(instance, vNode.children);

    instance.proxy = new Proxy(instance, handler);

    const { data = () => ({}), render, setup } = vNode.type as Component;

    if (setup) {
        const setupContext: SetupContext = {
            slots: instance.slots,
            attrs: instance.attrs,
            emit(event: string, ...payload: Array<any>) {
                const eventName = `on${
                    event[0].toUpperCase() + event.slice(1)
                }`;
                if (
                    (instance.vNode.props,
                    hasOwn(instance.vNode.props, eventName))
                ) {
                    const handler = instance.vNode.props[eventName];
                    if (isFunction(handler)) {
                        handler(...payload);
                    } else {
                        console.warn(
                            `Event handler for ${eventName} is not a function`
                        );
                    }
                }
            },
            expose(value: Record<string, any>) {
                instance.exposed = value;
            },
        };
        setCurrentInstance(instance);
        const setupRes = setup(instance.props, setupContext);
        unsetCurrentInstance();

        if (isFunction(setupRes)) {
            instance.render = setupRes as () => VNode;
        } else {
            instance.setupState = proxyRefs(setupRes);
        }
    }

    if (!isFunction(data)) return console.warn("data must be a function");

    // data 中可以拿到props
    instance.data = reactive(data.call(instance.proxy));

    // 如果已经有了setup中的render函数，则不需要再设置
    if (!instance.render) {
        instance.render = render;
    }
}

export let currentInstance: Instance | null = null;
export const getCurrentInstance = (): Instance => {
    return currentInstance;
};
export const setCurrentInstance = (instance: Instance) => {
    currentInstance = instance;
};
export const unsetCurrentInstance = () => {
    currentInstance = null;
};
