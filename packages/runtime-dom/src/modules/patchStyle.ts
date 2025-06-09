export default function patchStyle(el: any, prevValue: any, nextValue: any) {
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
