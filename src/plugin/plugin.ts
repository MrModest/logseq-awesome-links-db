
import { faviconsLoad, faviconsUnload } from '../modules/favIcons/favIcons';
import { body, globals } from '../modules/globals';
import { initLinksObserver, runLinksObserver, initTabsObserver, runTabsObserver, stopLinksObserver, stopTabsObserver } from '../modules/linksObserver/linksObserver';
import { pageIconsLoad, pageIconsUnload } from '../modules/pageIcons/pageIcons';

export const pluginLoad = () => {
    runStuff();

    setTimeout(() => {
        // Listen plugin unload
        logseq.beforeunload(async () => {
            stopStuff();
        });
    }, 2000)
}

export const runStuff = async () => {
    body.classList.add(globals.isPluginEnabled);
    setTimeout(() => {
        pageIconsLoad();
        faviconsLoad();
    }, 3000);
    setTimeout(() => {
        if (globals.pluginConfig.faviconsEnabled || globals.pluginConfig.pageIconsEnabled) {
            initLinksObserver();
            runLinksObserver();
        }
        if (globals.pluginConfig.pageIconsEnabled) {
            initTabsObserver();
            runTabsObserver();
        }
    }, 4000);
}

export const stopStuff = () => {
    body.classList.remove(globals.isPluginEnabled);
    pageIconsUnload();
    faviconsUnload();
    stopLinksObserver();
    stopTabsObserver();
}
