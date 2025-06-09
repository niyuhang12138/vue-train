const o = {
    name: "zs",
};

const p = new Proxy(o, {
    get(target, key, receiver) {
        console.log(
            `get ${key}`,
            Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
        );
        return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
        console.log(`set ${key} to ${value}`);
        return Reflect.set(target, key, value, receiver);
    },
});

p.name;

console.log(Object.getPrototypeOf(o) === Object.getPrototypeOf(p)); // true

const c = Object.create(p);

console.log(Object.getPrototypeOf(c) === p); // true

console.log(Object.getPrototypeOf(c) === Object.getPrototypeOf(p)); // false

c.name;
