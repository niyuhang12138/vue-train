// 元素的增删改查，查找关系， 文本的增删改查

export const nodeOps = {
    createElement(tagName: string): HTMLElement {
        // 这里的tagName是小写的
        const el = document.createElement(tagName);
        return el;
    },
    // 移动性的操作
    // A B C D -> A C D B
    insert: (
        child: HTMLElement,
        parent: HTMLElement,
        anchor?: HTMLElement | null
    ) => {
        parent.insertBefore(child, anchor || null); // anchor为null时，表示在parent的最后插入child
    },
    remove(child: HTMLElement) {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    querySelector(selector: string): HTMLElement | null {
        return document.querySelector(selector);
    },
    parentNode(node: Node): Node | null {
        return node.parentNode;
    },
    nextSibling(node: Node): Node | null {
        return node.nextSibling;
    },
    setElementText(el: HTMLElement, text: string) {
        el.textContent = text;
    },
    createText(text: string): Text {
        return document.createTextNode(text);
    },
    setText(node: Text, text: string) {
        node.nodeValue = text;
    },
};
