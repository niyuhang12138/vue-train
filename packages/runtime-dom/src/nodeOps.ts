// 主要是对节点的增删改查

import { DomRenderOptions } from ".";

const doc = document;

export const nodeOps: Omit<DomRenderOptions, "patchProp"> = {
    insert(child, parent, anchor = null) {
        parent.insertBefore(child, anchor);
    },
    remove(child) {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    createElement(type) {
        return doc.createElement(type as string);
    },
    createText(text) {
        return doc.createTextNode(text);
    },
    createComment(common) {
        return doc.createComment(common);
    },
    setText(node, text) {
        node.nodeValue = text;
    },
    setElementText(el, text) {
        el.textContent = text;
    },
    parentNode(node) {
        return node.parentNode;
    },
    nextSibling(node) {
        return node.nextSibling;
    },
    querySelector(selector) {
        return doc.querySelector(selector);
    },
    cloneNode(node) {
        return node.cloneNode(true);
    },
};
