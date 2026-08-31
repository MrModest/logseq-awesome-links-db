// User-defined favicon rules. Private hosts - a self-hosted Confluence, an
// internal wiki - are invisible to every public favicon resolver, so the only
// way to give them an icon is to say so explicitly.
//
// One rule per line: `<match> :: <icon> [color]`
//
//   atlassian.cloud.deliveryhero.group :: ti:notebook #0052CC
//   wiki.corp/handbook                 :: 📗
//   intranet.corp                      :: https://intranet.corp/logo.png
//
// Tabler ids are the ones Logseq's own icon picker uses.
//
// A match containing `/` is tested against the whole URL; otherwise it is a
// hostname, matching that host and its subdomains. A leading `*.` is allowed
// and ignored. Icons are a Tabler icon id prefixed `ti:`, an image URL, or any
// text or emoji.

export interface customRule {
    match: string;
    isUrlMatch: boolean;
    icon: string;
    color: string;
}

export const parseCustomIcons = (settingsText: string): customRule[] => {
    const rules: customRule[] = [];
    if (!settingsText) {
        return rules;
    }
    const lines = settingsText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#') || !line.includes('::')) {
            continue;
        }
        const separatorAt = line.indexOf('::');
        const match = line.slice(0, separatorAt).trim().toLowerCase().replace(/^\*\./, '');
        const iconSpec = line.slice(separatorAt + 2).trim();
        if (!match || !iconSpec) {
            continue;
        }
        // A trailing hex value is a color for the icon, not part of it
        const colorMatch = iconSpec.match(/\s(#[0-9a-fA-F]{3,8})$/);
        rules.push({
            match,
            isUrlMatch: match.includes('/'),
            icon: colorMatch ? iconSpec.slice(0, colorMatch.index).trim() : iconSpec,
            color: colorMatch ? colorMatch[1] : '',
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
