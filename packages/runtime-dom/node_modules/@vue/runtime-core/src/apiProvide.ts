import { hasOwn } from "@vue/shared";
import { currentInstance } from ".";

export function provide(key, value) {
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

export function inject(key) {
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
