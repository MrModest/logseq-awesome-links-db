import '@logseq/libs';

import { escapeForEdn } from './queries';

type propertyDefinition = {
    ident: string;
    type: string;
};

export type renderedLinkLabel = {
    title: string;
    label: string;
};

const RENDER_TEMPLATE_PROPERTY = 'renderTemplate';
const TITLE_REFERENCE_PROPERTY_TYPES = new Set([
    'asset',
    'date',
    'entity',
    'node',
    'page',
]);
const VALUE_REFERENCE_PROPERTY_TYPES = new Set([
    'default',
    'number',
    'url',
]);

const propertyDefinitions = new Map<string, Promise<propertyDefinition | null>>();
const renderedLabels = new Map<string, Promise<renderedLinkLabel | null>>();

export const clearRenderTemplateCache = () => {
    propertyDefinitions.clear();
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
    let definition = propertyDefinitions.get(key);
    if (!definition) {
        definition = findPropertyDefinition(propertyName);
        propertyDefinitions.set(key, definition);
    }
    return definition;
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

const resolveReferenceValue = async (value: unknown, propertyType: string): Promise<string | null> => {
    if (typeof value !== 'number') {
        return value == null ? null : String(value);
    }
    if (VALUE_REFERENCE_PROPERTY_TYPES.has(propertyType)) {
        const valueRows = await queryRows(
            `[:find ?resolved :where [${value} :logseq.property/value ?resolved]]`
        );
        if (valueRows.length) {
            return String(valueRows[0][0]);
        }
    }
    const titleRows = await queryRows(`[:find ?resolved :where [${value} :block/title ?resolved]]`);
    return titleRows.length ? String(titleRows[0][0]) : null;
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
        const value = row[0];
        if (TITLE_REFERENCE_PROPERTY_TYPES.has(definition.type)
            || VALUE_REFERENCE_PROPERTY_TYPES.has(definition.type)) {
            return resolveReferenceValue(value, definition.type);
        }
        if (definition.type === 'datetime' && typeof value === 'number') {
            return new Date(value).toLocaleString();
        }
        return value == null ? null : String(value);
    }));
    const presentValues = values.filter((value): value is string => value !== null);
    return {
        known: true,
        value: presentValues.length ? presentValues.join(', ') : null,
    };
}

const templateFields = (template: string): string[] => {
    const fields = new Set<string>();
    for (const match of template.matchAll(/\{([^{}]+)\}/g)) {
        const field = match[1].trim();
        if (field) {
            fields.add(field);
        }
    }
    return [...fields];
}

export const applyRenderTemplate = (template: string, values: Map<string, string>): string => {
    return template.replace(/\{([^{}]+)\}/g, (placeholder, rawField: string) => {
        const value = values.get(rawField.trim().toLowerCase());
        return value === undefined ? placeholder : value;
    });
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
        label: applyRenderTemplate(found.template, values),
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
