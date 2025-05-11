import { ReactiveEffect } from "./effect";

export let activeEffectScope: EffectScope | null = null;

export class EffectScope {
    public active = true;
    public effects: Array<ReactiveEffect> = [];
    public parent: EffectScope | null = null;
    public scopes: Array<EffectScope> = [];
    constructor(detached = false) {
        if (activeEffectScope && !detached) {
            activeEffectScope.scopes.push(this);
        }
    }

    run(fn: Function) {
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
            this.effects.forEach((effect: ReactiveEffect) => {
                effect.stop();
            });
            this.active = false;
        }
        this.scopes.forEach((scope) => {
            scope.stop();
        });
    }
}

export function recordEffectScope(effect: ReactiveEffect) {
    if (!(activeEffectScope && activeEffectScope.active)) {
        return;
    }
    activeEffectScope.effects.push(effect);
}

export function effectScope(detached = false) {
    return new EffectScope(detached);
}
