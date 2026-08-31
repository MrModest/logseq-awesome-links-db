import { doc, globals } from '../globals';
// import { stopLinksObserver } from '../linksObserver/linksObserver';
import { getPropsByPageName } from '../pageIcons/queries';
import { isNeedLowContrastFix } from '../utils';

import favIconsStyles from './favIcons.css?inline';
import { parseCustomIcons, matchCustomRule, customIconMarkup, isImageUrl, customRule } from './customIcons';

// Shown wherever a real favicon cannot be resolved
const globeFavicon = '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z"/><path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0m.6-3h16.8M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18m1-18a17 17 0 0 1 0 18"/></svg>';

type favRecord = {
    format:  'img' | 'svg';
    src: string;
};

let customRules: customRule[] = [];

export const reloadCustomIcons = () => {
    customRules = parseCustomIcons(globals.pluginConfig.customIcons);
    globals.favIconsCache.clear();
}

// External links favicons
export const setFavicons = async (extLinkList?: HTMLElement[]) => {
    if (!extLinkList) {
        extLinkList = [...doc.querySelectorAll(globals.extLinksSelector)];
    }
    for (let i = 0; i < extLinkList.length; i++) {
        const extLinkItem = extLinkList[i] as HTMLAnchorElement;
        setIconToExtItem(extLinkItem);
        if (globals.pluginConfig.inheritExtColor) {
            setColorToExtItem(extLinkItem);
        }
    }
}

// One host can serve several products - docs.google.com/document and
// docs.google.com/spreadsheets get different icons - so the first path
// segment belongs in the key alongside the hostname.
const getCacheKey = (url: string): string => {
    let parsed;
    try {
        parsed = new URL(url);
    } catch (error) {
        return '';
    }
    if (!parsed.hostname) {
        return '';
    }
    const firstSegment = parsed.pathname.split('/').filter(Boolean)[0] || '';
    return `${parsed.hostname}/${firstSegment}`;
}

const setIconToExtItem = async (extLinkItem: HTMLAnchorElement) => {
    const oldFav = extLinkItem.querySelector('.awLi-favicon');
    if (oldFav) {
        oldFav.remove();
    }
    const url = extLinkItem.href;
    let faviconData: favRecord = {
        format: 'img',
        src: ''
    };
    const cacheKey = getCacheKey(url);
    if (!cacheKey) {
        // skip cache for strange URIs
        faviconData = await getFaviconData(url);
    } else {
        if (globals.favIconsCache.has(cacheKey)) {
            // try from cache
            faviconData = globals.favIconsCache.get(cacheKey);
        } else {
            // no? get fresh + save to cache
            faviconData = await getFaviconData(url);
            globals.favIconsCache.set(cacheKey, faviconData);
        }
    }
    if (faviconData.format === 'img') {
        // An empty source would render as a broken-image glyph
        if (!faviconData.src) {
            extLinkItem.insertAdjacentHTML('afterbegin', globeFavicon);
            return;
        }
        // use IMG
        const fav = doc.createElement('img');
        fav.classList.add('awLi-favicon');
        fav.addEventListener('error', () => {
            fav.remove();
            extLinkItem.insertAdjacentHTML('afterbegin', globeFavicon);
        }, { once: true });
        fav.src = faviconData.src;
        extLinkItem.insertAdjacentElement('afterbegin', fav);
        return;
    }
    if (faviconData.format === 'svg') {
        // use default SVG
        extLinkItem.insertAdjacentHTML('afterbegin', faviconData.src);
    }
}

// Known product icons are referenced by URL rather than fetched and inlined:
// an <img> loads cross-origin regardless of CORS, while fetch() does not, and
// a load failure falls through to the globe anyway.
const getFaviconData = async (url: string): Promise<favRecord> => {
    let favIcon: favRecord = {
        format: 'img',
        src: ''
    };
    const { hostname, protocol } = new URL(url);
    // A user rule outranks everything, including the built-in matches
    const custom = matchCustomRule(customRules, url, hostname);
    if (custom) {
        return favIcon = {
            format: isImageUrl(custom.icon) ? 'img' : 'svg',
            src: isImageUrl(custom.icon) ? custom.icon : customIconMarkup(custom)
        };
    }
    // email
    if (protocol === 'message:' || protocol === 'mailto:') {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 7 9 6 9-6"/></svg>'
        };
    }
    // tel
    if (protocol === 'tel:') {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z"/><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>'
        };
    }
    // logseq
    if (protocol === 'logseq:') {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 80 80"><rect width="64" height="64" x="8" y="8" fill="#002B34" rx="12"/><path fill="#86C8C8" d="M18.6 18.3c-2 .6-3.2 1.7-4 3.5-2.5 5 1.7 11.8 7.7 12.5 2.4.3 4.1-.3 5.7-2 2.4-2.4 2.7-5.4 1-8.8-1.9-4-6.8-6.4-10.4-5.2ZM41 34.9c-3 .6-4.1 1-7 2.5-6 3-9.4 8.9-8.5 14.4.7 4 4 8.5 8.1 11a26.1 26.1 0 0 0 22 1.4c4.2-1.8 7.8-5 9.4-8.5 1.7-3.6 1.5-8-.6-11.7-1.2-2-4.6-5.2-7-6.5A27.2 27.2 0 0 0 41 34.9Z"/><ellipse cx="44.1" cy="22.1" fill="#86C8C8" rx="8.8" ry="5.5" transform="rotate(-15 44 22)"/></svg>'
        };
    }
    // zotero
    if (protocol === 'zotero:') {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 31"><path fill="#cc2936" d="M15.5 8.4 4 23.4h12V26H0v-2L11.5 8.9H.5V6.3h15Z"/></svg>'
        };
    }
    // local
    if (protocol === 'file:') {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/></svg>'
        };
    }
    // http - custom
    if (hostname === 'youtu.be') {
        return favIcon = {
            format: 'img',
            src: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://youtube.com&size=32'
        };
    }
    if (hostname === 'gmail.com' || hostname === 'mail.google.com') {
        return favIcon = {
            format: 'img',
            src: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico'
        }
    }
    if (url.includes('docs.google.com/document')) {
        return favIcon = {
            format: 'img',
            src: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'
        }
    }
    if (url.includes('docs.google.com/spreadsheets')) {
        return favIcon = {
            format: 'img',
            src: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico'
        }
    }
    if (url.includes('docs.google.com/presentation')) {
        return favIcon = {
            format: 'img',
            src: 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico'
        }
    }
    // Every Drive path - a folder, a shared file - carries the same icon,
    // where the generic resolver only knows the host as Google
    if (hostname === 'drive.google.com') {
        return favIcon = {
            format: 'img',
            src: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png'
        }
    }
    // Workspace hosts are private, so no public resolver can see their icon
    if (hostname === 'slack.com' || hostname.endsWith('.slack.com')) {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.8 122.8"><path fill="#E01E5A" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"/><path fill="#36C5F0" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"/><path fill="#2EB67D" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"/><path fill="#ECB22E" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"/></svg>'
        };
    }
    if (url.includes('.atlassian.net/jira/') || url.includes('.atlassian.net/browse/')) {
        return favIcon = {
            format: 'svg',
            src: '<svg class="awLi-favicon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 80 80"><defs><linearGradient id="a" x1="38.1" x2="23.2" y1="18.5" y2="33.5" gradientUnits="userSpaceOnUse"><stop offset=".2" stop-color="#0052cc"/><stop offset="1" stop-color="#2684ff"/></linearGradient><linearGradient xlink:href="#a" id="b" x1="42.1" x2="57" y1="61.5" y2="46.5"/></defs><path d="M74.2 38 43 6.9l-3-3-23.4 23.4L5.9 38a2.9 2.9 0 0 0 0 4l21.4 21.5L40 76.3l23.5-23.5.3-.3L74.2 42a2.9 2.9 0 0 0 0-4.1ZM40 50.8 29.3 40 40 29.4 50.7 40Z" style="fill:#2684ff"/><path d="M40 29.4A18 18 0 0 1 40 4L16.5 27.4 29.3 40 40 29.4Z" style="fill:url(#a)"/><path d="M50.8 40 40 50.8a18 18 0 0 1 0 25.5l23.5-23.5Z" style="fill:url(#b)"/></svg>'
        };
    }
    // http - common. The resolver answers for an unknown host with its own
    // placeholder, and a failed load falls through to the globe.
    if (protocol === 'http:' || protocol === 'https:') {
        favIcon = {
            format: 'img',
            src: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${hostname}&size=32`
        }
    }
    return favIcon;
}

const setColorToExtItem = async (extLinkItem: HTMLAnchorElement) => {
    const parentRef = extLinkItem.closest('.ls-block[data-refs-self]');
    if (!parentRef) {
        return;
    }
    const refPageAttr = parentRef.getAttribute('data-refs-self') || '';
    const refPageArray = JSON.parse(refPageAttr);
    if (!refPageArray.length) {
        return;
    }
    const refPageTitle = refPageArray[0].toLowerCase();
    if (refPageTitle) {
        const pageProps = await getPropsByPageName(refPageTitle);
        if (pageProps) {
            const pageColor = pageProps['color'];
            if (pageColor && pageColor !== 'none') {
                extLinkItem.style.setProperty('--awLi-color', pageColor);
                extLinkItem.classList.add('awLi-color');
                if (globals.pluginConfig.fixLowContrast && isNeedLowContrastFix(pageColor, globals.themeBg)) {
                    extLinkItem.classList.add('awLi-stroke');
                }
            }
        }
    }
}

const removeFavicons = () => {
    const favicons = doc.querySelectorAll('.awLi-favicon');
    if (favicons.length) {
        for (let i = 0; i < favicons.length; i++) {
            favicons[i].remove();
        }
    }
}

const setFaviconsColor = () => {
    const extLinkList = [...doc.querySelectorAll(globals.extLinksSelector)];
    if (extLinkList.length) {
        for (let i = 0; i < extLinkList.length; i++) {
            setColorToExtItem(extLinkList[i]);
        }
    }
}

const removeFaviconsColor = () => {
    const extLinkList = [...doc.querySelectorAll(globals.extLinksSelector)];
    if (extLinkList.length) {
        for (let i = 0; i < extLinkList.length; i++) {
            const extLinkItem = extLinkList[i] as HTMLAnchorElement;
            extLinkItem.style.setProperty('--awLi-color', '');
            extLinkItem.classList.remove('awLi-color', 'awLi-stroke');
        }
    }
}

export const toggleFaviconsFeature = () => {
    if (globals.pluginConfig.faviconsEnabled) {
        faviconsLoad();
    } else {
        faviconsUnload();
    }
}

export const toggleInheritExtColor = () => {
    if (globals.pluginConfig.inheritExtColor) {
        setFaviconsColor();
    } else {
        removeFaviconsColor();
    }
}

export const faviconsLoad = async () => {
    if (globals.pluginConfig.faviconsEnabled) {
        logseq.provideStyle({ key: 'awLi-favicon-css', style: favIconsStyles });
        customRules = parseCustomIcons(globals.pluginConfig.customIcons);
        setTimeout(() => {
            globals.favIconsCache = new Map();
            setFavicons();
        }, 500);
    }
}

export const faviconsUnload = () => {
    doc.head.querySelector(`style[data-injected-style="awLi-favicon-css-${globals.pluginID}"]`)?.remove();
    globals.favIconsCache.clear();
    removeFavicons();
}
