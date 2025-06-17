import { ref } from "@vue/reactivity";
import { h } from "../h";
import { isFunction } from "@vue/shared";

export function defineAsyncComponent(options: any) {
    if (isFunction(options)) {
        options = { loader: options };
    }

    return {
        setup() {
            const {
                loader,
                errorComponent,
                timeout,
                loadingComponent,
                delay,
                onError,
            } = options;
            const loaded = ref(false);
            const error = ref(false);
            const loading = ref(false);

            let loadingTimer = null;

            if (delay) {
                loadingTimer = setTimeout(() => {
                    loading.value = true;
                }, delay);
            }

            let Comp = null;

            let attempts = 0;
            function loadFunc() {
                return loader().catch((err) => {
                    if (onError) {
                        return new Promise((resolve, reject) => {
                            const retry = () => resolve(loadFunc());
                            const fail = () => reject(err);
                            onError(err, retry, fail, attempts++);
                        });
                    }
                });
            }

            loadFunc()
                .then((comp) => {
                    Comp = comp;
                    loaded.value = true;
                })
                .catch((err) => {
                    console.error("Failed to load component:", err);
                    error.value = true;
                })
                .finally(() => {
                    loading.value = false;
                    clearTimeout(loadingTimer);
                });

            if (timeout) {
                setTimeout(() => {
                    error.value = true;
                    throw new Error("Component loading timed out");
                }, timeout);
            }

            const placeholder = h("div", {}, "Placeholder...");

            return () => {
                if (loaded.value) {
                    return h(Comp);
                } else if (error.value && errorComponent) {
                    return h(errorComponent);
                } else if (loading.value && loadingComponent) {
                    return h(loadingComponent);
                } else {
                    return placeholder;
                }
            };
        },
    };
}
