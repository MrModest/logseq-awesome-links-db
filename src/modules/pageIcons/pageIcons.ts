import fastdom from 'fastdom'

import { body, doc, globals, iconObject, root } from '../globals';
import { isNeedLowContrastFix, injectPluginCSS, ejectPluginCSS } from '../utils';
import { getPropsByPageName, clearIconsCache } from './queries';
import { resolveTablerId } from './tablerIcon';

import pageIconsStyles from  './pageIcons.css?inline';
import tabsIframeStyles from  './tabsIframe.css?inline';

let tabsPluginIframe: HTMLIFrameElement;

export const toggleIconsFeature = () => {
    pageIconsUnload();
    if (globals.pluginConfig.pageIconsEnabled) {
        pageIconsLoad();
    }
}

export const pageIconsLoad = async () => {
    tabsPluginIframe = doc.getElementById('logseq-tabs_iframe') as HTMLIFrameElement;
    if (!globals.pluginConfig.pageIconsEnabled) {
        return;
    }
    body.classList.add('awLi-icons')
    logseq.provideStyle({ key: 'awLi-icon-css', style: pageIconsStyles });
    setTabsCSS();
    pageIconsRender();

    // Icons live in the graph, so a graph edit can invalidate any cached lookup
    logseq.DB.onChanged(() => {
        clearIconsCache();
    });
    logseq.App.onThemeChanged(() => {
        setTimeout(() => {
            pageIconsRender();
        }, 2000);
    });
    logseq.App.onThemeModeChanged(() => {
        setTimeout(() => {
            pageIconsRender();
        }, 2000);
    });
    logseq.App.onRouteChanged(() => {
        setActiveTabIcon();
    });
}

const pageIconsRender = () => {
    setStrokeColor();
    setTagType();
    setPageIcons();
    setTabIcons();
 }

export const pageIconsUnload = () => {
    body.classList.remove('awLi-icons');
    doc.head.querySelector(`style[data-injected-style="awLi-icon-css-${globals.pluginID}"]`)?.remove();
    removePageIcons();
    removeTabIcons();
    removeTabsCSS();
}

export const setPageIcons = async (context?: Document | HTMLElement) => {
    if (!context) {
        context = doc;
    }
    const titleLinksList = [...context.querySelectorAll(globals.titleSelector)];
    if (titleLinksList) {
        setStyleToLinkList(titleLinksList);
    }
    const pageLinksList = [...context.querySelectorAll(globals.pageLinksSelector)];
    if (pageLinksList.length) {
        setStyleToLinkList(pageLinksList);
    }
    const sidebarLinksList = [...context.querySelectorAll(globals.sidebarLinkSelector)];
    if (sidebarLinksList) {
        setStyleToLinkList(sidebarLinksList);
    }
}

export const setTabIcons = async () => {
    if (!tabsPluginIframe) {
        return;
    }
    if (tabsPluginIframe.contentDocument) {
        const tabLinksList = [...tabsPluginIframe.contentDocument.querySelectorAll(globals.tabLinkSelector)];
        if (tabLinksList) {
            setStyleToLinkList(tabLinksList);
        }
    }
}

export const setActiveTabIcon = async () => {
    if (tabsPluginIframe && tabsPluginIframe.contentDocument) {
        const tabLink = tabsPluginIframe.contentDocument.querySelector('.logseq-tab[data-active="true"] .logseq-tab-title') as HTMLElement;
        if (tabLink) {
            processLinkItem(tabLink);
        }
    }
}

export const setStyleToLinkList = (linkList: HTMLElement[]) => {
    if (!linkList.length) {
        return;
    }
    for (let i = 0; i < linkList.length; i++) {
        const linkItem = linkList[i];
        fastdom.mutate(() => {
            processLinkItem(linkItem);
        });
    }
}

export const processLinkItem = async (linkItem: HTMLElement) => {
    const linkText = linkItem.textContent;
    if (!linkText || linkText.startsWith(' ')) {
        return;
    }
    const pageTitle = getLinkTitle(linkItem);
    if (!pageTitle) {
        return;
    }
    const pageIcon = await getPropsByPageName(pageTitle);
    setIconToLinkItem(linkItem, pageIcon);
    setColorToLinkItem(linkItem, pageIcon);
 }

// `data-ref` holds the sanitized page name; titles and tab labels only have text
const getLinkTitle = (linkItem: HTMLElement): string => {
    return linkItem.getAttribute('data-ref')
        || linkItem.childNodes[1]?.textContent?.trim()
        || linkItem.textContent?.trim()
        || '';
}

const iconMarkup = (pageIcon: iconObject): string => {
    const isEmoji = pageIcon.type === 'emoji';
    const color = pageIcon.color ? ` style="color:${pageIcon.color}"` : '';
    const inner = isEmoji
        ? `<em-emoji id="${pageIcon.id}"></em-emoji>`
        : `<i class="ti ti-${resolveTablerId(pageIcon.id || '')}"></i>`;
    return `<span class="awLi-icon" data-is-emoji="${isEmoji}"${color}>${inner}</span>`;
}

const setIconToLinkItem = async (linkItem: HTMLElement, pageIcon: iconObject) => {
    linkItem.querySelector('.awLi-icon')?.remove();
    const nativeIcon = findNativeIcon(linkItem);
    if (!pageIcon.id) {
        showNativeIcon(nativeIcon);
        return;
    }
    // A node that owns its icon is already drawn correctly by Logseq
    if (nativeIcon && pageIcon.own) {
        showNativeIcon(nativeIcon);
        return;
    }
    // An inherited icon replaces the generic placeholder Logseq falls back to
    hideNativeIcon(nativeIcon);
    linkItem.insertAdjacentHTML('afterbegin', iconMarkup(pageIcon));
}

// Inline links contain their icon; sidebar entries keep it as a sibling of the
// title, inside the shared anchor.
const findNativeIcon = (linkItem: HTMLElement): HTMLElement | null => {
    return linkItem.querySelector(globals.nativeIconSelector)
        || linkItem.parentElement?.querySelector(globals.nativeSiblingIconSelector)
        || null;
}

const hideNativeIcon = (nativeIcon: HTMLElement | null) => {
    nativeIcon?.classList.add('awLi-nativeIconHidden');
}

const showNativeIcon = (nativeIcon: HTMLElement | null) => {
    nativeIcon?.classList.remove('awLi-nativeIconHidden');
}

const setColorToLinkItem = async (linkItem: HTMLElement, pageIcon: iconObject) => {
    linkItem.classList.remove('awLi-stroke');
    const pageColor = pageIcon.color;
    if (pageColor) {
        linkItem.style.setProperty('--awLi-color', pageColor);
        linkItem.classList.add('awLi-color');
        const bg = linkItem.classList.contains('tag') ? globals.themeColor : globals.themeBg
        if (globals.pluginConfig.fixLowContrast && isNeedLowContrastFix(pageColor, bg)) {
            linkItem.classList.add('awLi-stroke');
        }
    } else {
        linkItem.classList.remove('awLi-color');
        linkItem.style.removeProperty('--awLi-color');
    }
}

export const setTagType = () => {
    const tag = doc.createElement('a');
    tag.classList.add('tag');
    body.insertAdjacentElement('beforeend', tag);
    const tagBg = getComputedStyle(tag).backgroundColor.trim();
    tag.remove();
    if (tagBg !== 'rgba(0, 0, 0, 0)') {
        body.classList.add('awLi-tagHasBg');
        globals.tagHasBg = true;

    } else {
        body.classList.remove('awLi-tagHasBg');
        globals.tagHasBg = false;
    }
}

const setStrokeColor = () => {
    globals.themeColor = getComputedStyle(root).getPropertyValue('--ls-primary-text-color').trim();
    globals.themeBg = getComputedStyle(root).getPropertyValue('--ls-primary-background-color').trim();
}

const removePageIcons = () => {
    const linksList = [...doc.querySelectorAll(`${globals.pageLinksSelector}, ${globals.titleSelector}, ${globals.sidebarLinkSelector}`)];
    removeStyleFromLinkList(linksList);
}

const removeTabIcons = () => {
    if (!tabsPluginIframe || !tabsPluginIframe.contentDocument) {
        return;
    }
    const linksList = [...tabsPluginIframe.contentDocument.querySelectorAll(globals.tabLinkSelector)];
    removeStyleFromLinkList(linksList);
}

const removeStyleFromLinkList = (linkList: Element[]) => {
    if (linkList.length) {
        for (let i = 0; i < linkList.length; i++) {
            const linkItem = linkList[i] as HTMLElement;
            linkItem.style.removeProperty('--awLi-color');
            linkItem.classList.remove('awLi-color');
            linkItem.classList.remove('awLi-stroke');
            linkItem.querySelector('.awLi-icon')?.remove();
            showNativeIcon(findNativeIcon(linkItem));
        }
    }
}

// The tabs plugin renders in its own iframe, which has neither the plugin CSS
// nor Logseq's Tabler webfont - both get copied in from the host document.
const setTabsCSS = () => {
    injectPluginCSS('logseq-tabs_iframe', 'awLi-tabs-styles', tabsIframeStyles);
    injectTablerFont('logseq-tabs_iframe');
}

const injectTablerFont = (iframeId: string) => {
    const pluginIframe = doc.getElementById(iframeId) as HTMLIFrameElement;
    if (!pluginIframe || !pluginIframe.contentDocument) {
        return;
    }
    const tablerLink = doc.querySelector('link[href*="tabler-icons"]') as HTMLLinkElement;
    if (!tablerLink) {
        return;
    }
    pluginIframe.contentDocument.getElementById('awLi-tabler-css')?.remove();
    pluginIframe.contentDocument.head.insertAdjacentHTML(
        'beforeend',
        `<link rel="stylesheet" id="awLi-tabler-css" href="${tablerLink.href}">`
    );
}

const removeTabsCSS = () => {
    ejectPluginCSS('logseq-tabs_iframe', 'awLi-tabs-styles');
    const pluginIframe = doc.getElementById('logseq-tabs_iframe') as HTMLIFrameElement;
    pluginIframe?.contentDocument?.getElementById('awLi-tabler-css')?.remove();
}
