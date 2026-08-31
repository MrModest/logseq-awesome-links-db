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

// A node's own tags say more about it than the built-in class it belongs to, so
// Journal or Query only supplies an icon when no user tag has one.
const BUILTIN_IDENT_PREFIX = 'logseq.';

const isBuiltinTag = (tag: rawTag): boolean => {
    return String(readKey(tag, 'ident') || '').replace(/^:/, '').startsWith(BUILTIN_IDENT_PREFIX);
}

const iconsCache = new Map<string, iconObject>();

export const clearIconsCache = () => {
    iconsCache.clear();
}

const escapeForEdn = (title: string): string => {
    return title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Datascript results reach the plugin as plain JS, but the exact key spelling
// depends on how the keywords were converted, so read them leniently.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readKey = (obj: any, name: string): any => {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        const bare = keys[i].replace(/^:/, '').split('/').pop();
        if (bare === name) {
            return obj[keys[i]];
        }
    }
    return undefined;
}

const normalizeIcon = (icon: rawIcon): iconObject | null => {
    const id = readKey(icon, 'id');
    if (!id || typeof id !== 'string') {
        return null;
    }
    const type = String(readKey(icon, 'type') || 'tabler-icon').replace(/^:/, '');
    const color = readKey(icon, 'color');
    return {
        id: id.replace(/^:/, ''),
        type,
        color: typeof color === 'string' ? color : '',
    };
}

// Own icon wins; otherwise the first user tag that has one, matching the order
// Logseq itself uses (ascending :db/id).
const resolveIcon = (node: rawNode): iconObject | null => {
    const ownIcon = normalizeIcon(readKey(node, 'icon'));
    if (ownIcon) {
        ownIcon.own = true;
        return ownIcon;
    }
    const tags: rawTag[] = readKey(node, 'tags') || [];
    const byId = [...tags].sort((a, b) => (readKey(a, 'id') || 0) - (readKey(b, 'id') || 0));
    const ordered = [...byId.filter((tag) => !isBuiltinTag(tag)), ...byId.filter(isBuiltinTag)];
    for (let i = 0; i < ordered.length; i++) {
        const tagIcon = normalizeIcon(readKey(ordered[i], 'icon'));
        if (tagIcon) {
            tagIcon.own = false;
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
