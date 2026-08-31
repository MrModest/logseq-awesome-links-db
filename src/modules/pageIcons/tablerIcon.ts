import { doc } from '../globals';

// Logseq stores an icon id in either of two spellings: the webfont's kebab-case
// (`calendar-event`) or the React component's PascalCase (`CalendarEventFilled`),
// depending on where the icon was picked. The plugin renders through the
// webfont, so PascalCase has to be converted - and the filled variants the
// component set offers have no webfont glyph at all, so they fall back to the
// outline of the same icon.

let probe: HTMLElement | null = null;
const glyphCache = new Map<string, boolean>();

const toKebabCase = (id: string): string => {
    if (!/[A-Z]/.test(id)) {
        return id;
    }
    return id
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
}

// A webfont class with no glyph resolves to no ::before content
const hasGlyph = (id: string): boolean => {
    const cached = glyphCache.get(id);
    if (cached !== undefined) {
        return cached;
    }
    if (!probe) {
        probe = doc.createElement('i');
        probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
        doc.body.appendChild(probe);
    }
    probe.className = `ti ti-${id}`;
    const content = getComputedStyle(probe, ':before').content;
    const found = !!content && content !== 'none' && content !== 'normal' && content !== '""';
    glyphCache.set(id, found);
    return found;
}

export const resolveTablerId = (id: string): string => {
    const kebab = toKebabCase(id.trim());
    if (hasGlyph(kebab)) {
        return kebab;
    }
    // No filled glyph in the webfont, so use the outline of the same icon
    const outline = kebab.replace(/-filled$/, '');
    if (outline !== kebab && hasGlyph(outline)) {
        return outline;
    }
    return kebab;
}
