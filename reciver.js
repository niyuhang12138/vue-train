let person = {
    name: "jw",
    get aliasName() {
        return "** " + this.name + " **";
    },
};

let proxy = new Proxy(person, {
    get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
        return Reflect.set(target, prop, value, receiver);
    },
});

console.log(person.aliasName);
console.log(proxy.aliasName);
