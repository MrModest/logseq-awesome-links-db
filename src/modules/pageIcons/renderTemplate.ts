import '@logseq/libs';

import { escapeForEdn } from './queries';
import { renderTemplateLabel, templateFields } from './renderTemplateCore';

type propertyDefinition = {
    ident: string;
    type: string;
};

export type renderedLinkLabel = {
    title: string;
    label: string;
};

const RENDER_TEMPLATE_PROPERTY = 'renderTemplate';
const PROPERTY_DEFINITION_TTL_MS = 60_000;
const propertyDefinitions = new Map<string, {
    expiresAt: number;
    value: Promise<propertyDefinition | null>;
}>();
const renderedLabels = new Map<string, Promise<renderedLinkLabel | null>>();

export const clearRenderTemplateCache = () => {
    propertyDefinitions.clear();
    clearRenderedLabelsCache();
}

export const clearRenderedLabelsCache = () => {
    renderedLabels.clear();
}

const normalizeKeyword = (value: unknown): string => {
    return String(value || '').replace(/^:/, '');
}

const queryRows = async (query: string): Promise<unknown[][]> => {
    try {
        const result = await logseq.DB.datascriptQuery(query);
        return Array.isArray(result) ? result as unknown[][] : [];
    } catch (error) {
        console.error('AwesomeLinksDB: render template query failed', error);
        return [];
    }
}

const findPropertyDefinition = async (propertyName: string): Promise<propertyDefinition | null> => {
    const title = escapeForEdn(propertyName);
    const name = escapeForEdn(propertyName.toLowerCase());
    const query = `
    [
        :find ?ident ?type
        :where
            [?property :block/tags :logseq.class/Property]
            [?property :db/ident ?ident]
            [?property :logseq.property/type ?type]
            (or [?property :block/title "${title}"]
                [?property :block/name "${name}"])
    ]
    `;
    const rows = await queryRows(query);
    if (!rows.length) {
        return null;
    }
    return {
        ident: normalizeKeyword(rows[0][0]),
        type: normalizeKeyword(rows[0][1]),
    };
}

const getPropertyDefinition = (propertyName: string): Promise<propertyDefinition | null> => {
    const key = propertyName.toLowerCase();
    const cached = propertyDefinitions.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }
    const value = findPropertyDefinition(propertyName);
    propertyDefinitions.set(key, {
        expiresAt: Date.now() + PROPERTY_DEFINITION_TTL_MS,
        value,
    });
    return value;
}

const pageLookupClause = (pageTitle: string): string => {
    const title = escapeForEdn(pageTitle.trim());
    const name = escapeForEdn(pageTitle.trim().toLowerCase());
    return `[?page :block/name _]
            (or [?page :block/name "${name}"]
                [?page :block/title "${title}"])`;
}

const findTemplate = async (pageTitle: string): Promise<{ title: string; template: string } | null> => {
    const definition = await getPropertyDefinition(RENDER_TEMPLATE_PROPERTY);
    if (!definition?.ident) {
        return null;
    }
    const query = `
    [
        :find ?title ?tag ?template
        :where
            ${pageLookupClause(pageTitle)}
            [?page :block/title ?title]
            [?page :block/tags ?tag]
            [?tag :${definition.ident} ?template-value]
            [?template-value :block/title ?template]
    ]
    `;
    const rows = await queryRows(query);
    if (!rows.length) {
        return null;
    }
    rows.sort((a, b) => Number(a[1]) - Number(b[1]));
    return {
        title: String(rows[0][0] || pageTitle),
        template: String(rows[0][2] || ''),
    };
}

const resolvePropertyValue = async (value: unknown, propertyType: string): Promise<string | null> => {
    if (value == null) {
        return null;
    }
    if (typeof value !== 'number') {
        return String(value);
    }
    switch (propertyType) {
    case 'default':
    case 'number':
    case 'url': {
        const valueRows = await queryRows(
            `[:find ?resolved :where [${value} :logseq.property/value ?resolved]]`
        );
        if (valueRows.length) {
            return String(valueRows[0][0]);
        }
        const titleRows = await queryRows(`[:find ?resolved :where [${value} :block/title ?resolved]]`);
        return titleRows.length ? String(titleRows[0][0]) : null;
    }
    case 'asset':
    case 'date':
    case 'entity':
    case 'node':
    case 'page': {
        const titleRows = await queryRows(`[:find ?resolved :where [${value} :block/title ?resolved]]`);
        return titleRows.length ? String(titleRows[0][0]) : null;
    }
    case 'datetime':
        return new Date(value).toLocaleString();
    default:
        return String(value);
    }
}

type pagePropertyValue = {
    known: boolean;
    value: string | null;
};

const getPagePropertyValue = async (pageTitle: string, propertyName: string): Promise<pagePropertyValue> => {
    const definition = await getPropertyDefinition(propertyName);
    if (!definition?.ident) {
        return { known: false, value: null };
    }
    const query = `
    [
        :find ?value
        :where
            ${pageLookupClause(pageTitle)}
            [?page :${definition.ident} ?value]
    ]
    `;
    const rows = await queryRows(query);
    if (!rows.length) {
        return { known: true, value: null };
    }
    const values = await Promise.all(rows.map(async (row) => {
        return resolvePropertyValue(row[0], definition.type);
    }));
    const presentValues = values.filter((value): value is string => value !== null);
    return {
        known: true,
        value: presentValues.length ? presentValues.join(', ') : null,
    };
}

const buildRenderedLinkLabel = async (pageTitle: string): Promise<renderedLinkLabel | null> => {
    const found = await findTemplate(pageTitle);
    if (!found?.template) {
        return null;
    }
    const values = new Map<string, string>([['title', found.title]]);
    const fields = templateFields(found.template)
        .filter((field) => field.toLowerCase() !== 'title');
    await Promise.all(fields.map(async (field) => {
        const property = await getPagePropertyValue(found.title, field);
        if (property.known) {
            values.set(field.toLowerCase(), property.value || '');
        }
    }));
    return {
        title: found.title,
        label: renderTemplateLabel(found.template, values, found.title),
    };
}

export const getRenderedLinkLabel = (pageTitle: string): Promise<renderedLinkLabel | null> => {
    const key = pageTitle.trim().toLowerCase();
    let rendered = renderedLabels.get(key);
    if (!rendered) {
        rendered = buildRenderedLinkLabel(pageTitle);
        renderedLabels.set(key, rendered);
    }
    return rendered;
}
