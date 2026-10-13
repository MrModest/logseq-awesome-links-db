export const templateFields = (template: string): string[] => {
    const fields = new Set<string>();
    for (const match of template.matchAll(/\{([^{}]+)\}/g)) {
        const field = match[1].trim();
        if (field) {
            fields.add(field.toLowerCase());
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

export const renderTemplateLabel = (
    template: string,
    values: Map<string, string>,
    title: string,
): string => {
    const label = applyRenderTemplate(template, values);
    return label.trim() ? label : title;
}
