// User-defined favicon rules. Private hosts - a self-hosted Confluence, an
// internal wiki - are invisible to every public favicon resolver, so the only
// way to give them an icon is to say so explicitly.
//
// The setting is a JSON array, of either objects or `match :: icon [color]`
// strings:
//
//   "customIcons": [
//     { "match": "atlassian.cloud.example.com", "icon": "ti:notebook", "color": "#0052CC" },
//     { "match": "wiki.corp/handbook", "icon": "https://wiki.corp/logo.png" },
//     "intranet.corp :: 📗"
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

type ruleInput = string | { match?: string; icon?: string; color?: string };

const buildRule = (match: string, icon: string, color: string): customRule | null => {
    const cleanMatch = match.trim().toLowerCase().replace(/^\*\./, '');
    const cleanIcon = icon.trim();
    if (!cleanMatch || !cleanIcon) {
        return null;
    }
    return {
        match: cleanMatch,
        isUrlMatch: cleanMatch.includes('/'),
        icon: cleanIcon,
        color: color.trim(),
    };
}

const parseRuleLine = (line: string): customRule | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('::')) {
        return null;
    }
    const separatorAt = trimmed.indexOf('::');
    const iconSpec = trimmed.slice(separatorAt + 2).trim();
    // A trailing hex value is a color for the icon, not part of it
    const colorMatch = iconSpec.match(/\s(#[0-9a-fA-F]{3,8})$/);
    return buildRule(
        trimmed.slice(0, separatorAt),
        colorMatch ? iconSpec.slice(0, colorMatch.index).trim() : iconSpec,
        colorMatch ? colorMatch[1] : ''
    );
}

// Accepts the JSON array the setting now holds, and the newline-separated
// string earlier versions stored, so an existing value keeps working.
export const parseCustomIcons = (setting: unknown): customRule[] => {
    let entries: ruleInput[] = [];
    if (Array.isArray(setting)) {
        entries = setting;
    } else if (typeof setting === 'string') {
        entries = setting.split('\n');
    }
    const rules: customRule[] = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const rule = typeof entry === 'string'
            ? parseRuleLine(entry)
            : entry && entry.match && entry.icon
                ? buildRule(entry.match, entry.icon, entry.color || '')
                : null;
        if (rule) {
            rules.push(rule);
        }
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
