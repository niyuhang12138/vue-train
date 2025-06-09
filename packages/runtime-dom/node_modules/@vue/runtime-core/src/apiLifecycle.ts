import {
    currentInstance,
    setCurrentInstance,
    unsetCurrentInstance,
} from "./component";

export const enum LifeCycle {
    BEFORE_MOUNT = "bm", // beforeMount
    MOUNTED = "m", // mounted
    BEFORE_UPDATE = "bu", // beforeUpdate
    UPDATED = "u", // updated
    UNMOUNTED = "um", // unmounted
    // ACTIVATED = "a", // activated
    // DEACTIVATED = "da", // deactivated
}

const createHook = (lifeCycle: LifeCycle) => {
    return (hook, target = currentInstance) => {
        // 在或执行hook的时候需要保证instance的正确

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

export const onBeforeMount = createHook(LifeCycle.BEFORE_MOUNT);
export const onMounted = createHook(LifeCycle.MOUNTED);
export const onBeforeUpdate = createHook(LifeCycle.BEFORE_UPDATE);
export const onUpdated = createHook(LifeCycle.UPDATED);
export const onUnmounted = createHook(LifeCycle.UNMOUNTED);

export const invokeArray = (fns: Array<() => void>) => {
    fns.forEach((fn) => fn());
};
