import { globals } from '../globals';
import type { renderedLinkLabel } from './renderTemplate';

const RESOLVED_TITLE_ATTRIBUTE = 'data-awli-title';
const ORIGINAL_LABEL_ATTRIBUTE = 'data-awli-original-label';
const RENDERED_LABEL_ATTRIBUTE = 'data-awli-rendered-label';

const textNodes = function* (root: Element): Generator<Text> {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        yield node as Text;
    }
}

const isGeneratedGroupHeaderLink = (linkItem: HTMLElement): boolean => {
    return linkItem.matches('.page-ref')
        && Boolean(linkItem.closest('.ls-foldable-header'));
}

const findLabelTextNode = (linkItem: HTMLElement, title: string): Text | null => {
    const normalizedTitle = title.trim().toLowerCase();
    const previousRenderedLabel = (linkItem.getAttribute(RENDERED_LABEL_ATTRIBUTE) || '').toLowerCase();
    const generatedGroupHeader = isGeneratedGroupHeaderLink(linkItem);
    for (const node of textNodes(linkItem)) {
        const parent = node.parentElement;
        const isIcon = parent?.closest('.awLi-icon, .icon-emoji-wrap, .icon-cp-container');
        const normalizedText = node.textContent?.trim().toLowerCase() || '';
        const ordinaryLabel = normalizedText === normalizedTitle;
        const generatedGroupLabel = generatedGroupHeader
            && normalizedText.startsWith(`${normalizedTitle} `);
        const existingRenderedLabel = previousRenderedLabel
            && normalizedText === previousRenderedLabel;
        if (!isIcon && (ordinaryLabel || generatedGroupLabel || existingRenderedLabel)) {
            return node;
        }
    }
    return null;
}

export const restoreLinkLabel = (linkItem: Element) => {
    const originalText = linkItem.getAttribute(ORIGINAL_LABEL_ATTRIBUTE);
    const renderedText = linkItem.getAttribute(RENDERED_LABEL_ATTRIBUTE);
    if (originalText !== null && renderedText?.trim()) {
        for (const node of textNodes(linkItem)) {
            if (node.textContent?.trim() === renderedText.trim()) {
                node.textContent = originalText;
                break;
            }
        }
    }
    linkItem.removeAttribute(RESOLVED_TITLE_ATTRIBUTE);
    linkItem.removeAttribute(ORIGINAL_LABEL_ATTRIBUTE);
    linkItem.removeAttribute(RENDERED_LABEL_ATTRIBUTE);
}

// `data-ref` holds the sanitized page name. Some legacy reference links have
// no `data-ref`, so their canonical title is cached only while our rendered
// label is still visible.
export const resolveLinkTitle = (linkItem: HTMLElement): string => {
    const dataRef = linkItem.getAttribute('data-ref');
    const resolvedTitle = linkItem.getAttribute(RESOLVED_TITLE_ATTRIBUTE);
    const renderedLabel = linkItem.getAttribute(RENDERED_LABEL_ATTRIBUTE);
    const canUseCachedTitle = linkItem.matches(globals.renderLinksSelector)
        && renderedLabel !== null
        && linkItem.textContent?.includes(renderedLabel);
    const cachedTitle = canUseCachedTitle ? resolvedTitle : null;
    if (resolvedTitle && ((dataRef && dataRef !== resolvedTitle) || !canUseCachedTitle)) {
        restoreLinkLabel(linkItem);
    }
    const title = dataRef
        || cachedTitle
        || linkItem.childNodes[1]?.textContent?.trim()
        || linkItem.textContent?.trim()
        || '';
    if (title && linkItem.matches(globals.renderLinksSelector)) {
        linkItem.setAttribute(RESOLVED_TITLE_ATTRIBUTE, title);
    }
    return title;
}

export const applyLinkLabel = (linkItem: HTMLElement, rendered: renderedLinkLabel | null) => {
    if (!rendered) {
        restoreLinkLabel(linkItem);
        return;
    }
    // Explicit aliases have different text and remain exactly as authored.
    const labelNode = findLabelTextNode(linkItem, rendered.title);
    if (!labelNode) {
        return;
    }
    const originalText = labelNode.textContent || '';
    const label = rendered.label.trim() ? rendered.label : rendered.title;
    if (!linkItem.hasAttribute(ORIGINAL_LABEL_ATTRIBUTE)) {
        linkItem.setAttribute(ORIGINAL_LABEL_ATTRIBUTE, originalText);
    }
    labelNode.textContent = label;
    linkItem.setAttribute(RENDERED_LABEL_ATTRIBUTE, label);
}
