import '@logseq/libs';

import { iconObject } from '../globals';

// Raw shape of `:logseq.property/icon` as it comes back from datascript.
type rawIcon = {
    type?: string;
    id?: string;
    color?: string;
} | null | undefined;

type rawTag = {
    'db/id'?: number;
    'db/ident'?: string;
    'logseq.property/icon'?: rawIcon;
};

type rawNode = {
    'logseq.property/icon'?: rawIcon;
    'block/tags'?: rawTag[];
};

// Built-in classes (Page, Journal, Tag, Task...) carry generic icons that would
// drown out the user's own tags, so they never act as an inheritance source.
const BUILTIN_IDENT_PREFIX = 'logseq.';

const iconsCache = new Map<string, iconObject>();

export const clearIconsCache = () => {
    iconsCache.clear();
}

const escapeForEdn = (title: string): string => {
    return title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const normalizeIcon = (icon: rawIcon): iconObject | null => {
    if (!icon || !icon.id) {
        return null;
    }
    return {
        id: icon.id,
        type: icon.type || 'tabler-icon',
        color: icon.color || '',
    };
}

// Own icon wins; otherwise the first user tag that has one, matching the order
// Logseq itself uses (ascending :db/id).
const resolveIcon = (node: rawNode): iconObject | null => {
    const ownIcon = normalizeIcon(node['logseq.property/icon']);
    if (ownIcon) {
        return ownIcon;
    }
    const tags = (node['block/tags'] || [])
        .filter((tag) => !String(tag['db/ident'] || '').startsWith(BUILTIN_IDENT_PREFIX))
        .sort((a, b) => (a['db/id'] || 0) - (b['db/id'] || 0));
    for (let i = 0; i < tags.length; i++) {
        const tagIcon = normalizeIcon(tags[i]['logseq.property/icon']);
        if (tagIcon) {
            return tagIcon;
        }
    }
    return null;
}

export const getPropsByPageName = async (pageTitle: string): Promise<iconObject> => {
    const name = pageTitle.toLowerCase().trim();
    if (!name) {
        return Object.create(null);
    }
    const cached = iconsCache.get(name);
    if (cached) {
        return cached;
    }
    const nodeQuery = `
    [
        :find (pull ?p [:logseq.property/icon
                        {:block/tags [:db/id :db/ident :logseq.property/icon]}])
        :where
            [?p :block/name "${escapeForEdn(name)}"]
    ]
    `;
    let icon: iconObject | null = null;
    try {
        const queryResult = await logseq.DB.datascriptQuery(nodeQuery);
        if (queryResult && queryResult[0] && queryResult[0][0]) {
            icon = resolveIcon(queryResult[0][0] as rawNode);
        }
    } catch (error) {
        console.error('AwesomeLinksDB: icon query failed', error);
    }
    const props: iconObject = icon || Object.create(null);
    iconsCache.set(name, props);
    return props;
}
