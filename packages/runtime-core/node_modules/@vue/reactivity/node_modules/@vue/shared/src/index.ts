export * from "./shapeFlags";
export * from "./patchFlags";

export function isObject(value: unknown): value is object {
    return typeof value === "object" && value !== null;
}

export function isFunction(value: unknown): value is Function {
    return typeof value === "function";
}

export function isString(value: unknown): value is string {
    return typeof value === "string";
}

export const ownProperty = Object.hasOwn;

export const invokeArrayFn = (fns: Function[]) => {
    fns.forEach((fn) => fn());
};

export const objectToString: typeof Object.prototype.toString =
    Object.prototype.toString;

export const toTypeString = (value: unknown): string =>
    objectToString.call(value);

export const toRawType = (value: unknown): string => {
    return toTypeString(value).slice(8, -1);
};

export const isArray: typeof Array.isArray = Array.isArray;

export const isIntegerKey = (key: unknown): boolean =>
    isString(key) &&
    key !== "NAN" &&
    key[0] !== "-" &&
    "" + parseInt(key as string, 10) === key;

export const hasOwnProperty: typeof Object.prototype.hasOwnProperty =
    Object.prototype.hasOwnProperty;

export const hasOwn = (
    value: object,
    key: string | symbol
): key is keyof typeof value => hasOwnProperty.call(value, key);

export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue);

export const isSymbol = (value: unknown): value is symbol =>
    typeof value === "symbol";

export const extend = Object.assign;
