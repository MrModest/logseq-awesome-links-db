// User-defined favicon rules. Private hosts - a self-hosted Confluence, an
// internal wiki - are invisible to every public favicon resolver, so the only
// way to give them an icon is to say so explicitly.
//
// The setting is a JSON array:
//
//   "customIcons": [
//     { "match": "atlassian.cloud.example.com", "icon": "ti:notebook", "color": "#0052CC" },
//     { "match": "wiki.corp/handbook", "icon": "https://wiki.corp/logo.png" },
//     { "match": "intranet.corp", "icon": "📗" }
//   ]
//
// A match containing `/` is tested against the whole URL; otherwise it is a
// hostname, matching that host and its subdomains. A leading `*.` is allowed
// and ignored. Icons are a Tabler icon id prefixed `ti:` (the ids the Logseq
// icon picker uses), an image URL, or any text or emoji.

export interface customRule {
    match: string;
    isUrlMatch: boolean;
    icon: string;
    color: string;
}

interface ruleInput {
    match?: string;
    icon?: string;
    color?: string;
}

export const parseCustomIcons = (setting: unknown): customRule[] => {
    const rules: customRule[] = [];
    if (!Array.isArray(setting)) {
        return rules;
    }
    for (let i = 0; i < setting.length; i++) {
        const entry = setting[i] as ruleInput;
        if (!entry || !entry.match || !entry.icon) {
            continue;
        }
        const match = entry.match.trim().toLowerCase().replace(/^\*\./, '');
        const icon = entry.icon.trim();
        if (!match || !icon) {
            continue;
        }
        rules.push({
            match,
            isUrlMatch: match.includes('/'),
            icon,
            color: (entry.color || '').trim(),
        });
    }
    return rules;
}

export const matchCustomRule = (rules: customRule[], url: string, hostname: string): customRule | null => {
    const lowerUrl = url.toLowerCase();
    const lowerHost = hostname.toLowerCase();
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.isUrlMatch) {
            if (lowerUrl.includes(rule.match)) {
                return rule;
            }
            continue;
        }
        if (lowerHost === rule.match || lowerHost.endsWith(`.${rule.match}`)) {
            return rule;
        }
    }
    return null;
}

const escapeHtml = (text: string): string => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const isImageUrl = (icon: string): boolean => {
    return /^(https?:\/\/|data:image\/|lsp:\/\/|assets:\/\/|file:\/\/)/i.test(icon);
}

// Tabler ids and plain text both render as markup; image URLs are handled by
// the caller so they go through the same <img> error fallback as the rest.
export const customIconMarkup = (rule: customRule): string => {
    const style = rule.color ? ` style="color:${escapeHtml(rule.color)}"` : '';
    if (rule.icon.startsWith('ti:')) {
        const iconId = escapeHtml(rule.icon.slice(3).trim());
        return `<i class="ti ti-${iconId} awLi-favicon awLi-favicon-glyph"${style}></i>`;
    }
    return `<span class="awLi-favicon awLi-favicon-glyph"${style}>${escapeHtml(rule.icon)}</span>`;
}
