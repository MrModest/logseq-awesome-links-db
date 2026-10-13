import fastdom from 'fastdom'

import { body, doc, globals, iconObject, root } from '../globals';
import { isNeedLowContrastFix, injectPluginCSS, ejectPluginCSS } from '../utils';
import { getPropsByPageName, clearIconsCache } from './queries';
import { clearRenderedLabelsCache, clearRenderTemplateCache, getRenderedLinkLabel } from './renderTemplate';
import { applyLinkLabel, resolveLinkTitle, restoreLinkLabel } from './renderedLabelState';
import { resolveTablerId } from './tablerIcon';

import pageIconsStyles from  './pageIcons.css?inline';
import tabsIframeStyles from  './tabsIframe.css?inline';

let tabsPluginIframe: HTMLIFrameElement;
const offHooks: (() => void)[] = [];

const createRenderScheduler = (delay: number) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
        run: () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (globals.pluginConfig.pageIconsEnabled) {
                    pageIconsRender();
                }
            }, delay);
        },
        cancel: () => clearTimeout(timer),
    };
}

const graphChangeRender = createRenderScheduler(300);
const themeChangeRender = createRenderScheduler(2000);

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
    clearIconsCache();
    clearRenderTemplateCache();
    pageIconsRender();

    // Icons live in the graph, so a graph edit can invalidate any cached lookup
    offHooks.push(logseq.DB.onChanged(() => {
        clearIconsCache();
        clearRenderedLabelsCache();
        graphChangeRender.run();
    }));
    offHooks.push(logseq.App.onThemeChanged(() => {
        themeChangeRender.run();
    }));
    offHooks.push(logseq.App.onThemeModeChanged(() => {
        themeChangeRender.run();
    }));
    offHooks.push(logseq.App.onRouteChanged(() => {
        if (globals.pluginConfig.pageIconsEnabled) {
            setActiveTabIcon();
        }
    }));
}

const pageIconsRender = () => {
    setStrokeColor();
    setTagType();
    setPageIcons();
    setTabIcons();
 }

export const pageIconsUnload = () => {
    graphChangeRender.cancel();
    themeChangeRender.cancel();
    offHooks.splice(0).forEach((off) => off());
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
    if (linkText?.startsWith(' ')) {
        return;
    }
    const pageTitle = resolveLinkTitle(linkItem);
    if (!pageTitle) {
        return;
    }
    const renderLabel = linkItem.matches(globals.renderLinksSelector);
    const [pageIcon, renderedLabel] = await Promise.all([
        getPropsByPageName(pageTitle),
        renderLabel ? getRenderedLinkLabel(pageTitle) : Promise.resolve(null),
    ]);
    if (renderLabel) {
        applyLinkLabel(linkItem, renderedLabel);
    }
    setIconToLinkItem(linkItem, pageIcon);
    setColorToLinkItem(linkItem, pageIcon);
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
    linkItem.classList.remove('awLi-hasIcon');
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
    // Appended rather than prepended: an inline-flex box takes its baseline
    // from its first child, so the text has to come first for the link to sit
    // on the same line as its surroundings. CSS `order` puts the icon in front.
    linkItem.insertAdjacentHTML('beforeend', iconMarkup(pageIcon));
    linkItem.classList.add('awLi-hasIcon');
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
            linkItem.classList.remove('awLi-hasIcon');
            restoreLinkLabel(linkItem);
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
