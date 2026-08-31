import { logseq as PL } from '../../package.json';

type globalContextType = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

// Logseq DB graphs keep the icon and its colour in a single
// `:logseq.property/icon` value: `{:type :tabler-icon :id "target" :color "#e47a00"}`.
export interface iconObject {
    id?: string;
    type?: string;
    color?: string;
}

export const doc = parent.document;
export const root = doc.documentElement;
export const body = doc.body;

export const globals: globalContextType = {
    pluginID: PL.id,
    pluginConfig: null,
    isPluginEnabled: 'is-awLi-enabled',
    extLinksSelector: '.external-link',
    pageLinksSelector: '.page-ref:not(.page-property-key), .tag, .references li a',
    titleSelector: '.page-title, .journal-title .title',
    sidebarLinkSelector: '.nav-contents-container .page-title',
    tabLinkSelector: '.logseq-tab:not(.close-all) .logseq-tab-title',
    // Icons Logseq renders itself, so the plugin never doubles up on them
    nativeIconSelector: '.icon-emoji-wrap, .icon-cp-container',
    tagHasBg: false,
    themeColor: '',
    themeBg: '',
    favIconsCache: Object.create(null),
};
