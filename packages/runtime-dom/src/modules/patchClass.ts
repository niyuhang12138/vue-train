export default function patchClass(el: Element, value: any) {
    if (value) el.className = value;
    else el.removeAttribute("class");
}
