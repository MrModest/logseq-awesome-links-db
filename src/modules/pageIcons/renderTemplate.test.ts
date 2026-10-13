import { describe, expect, it } from 'vitest';

import { applyRenderTemplate, renderTemplateLabel, templateFields } from './renderTemplateCore';

describe('render templates', () => {
    it('extracts normalized unique fields', () => {
        expect(templateFields('{ title } — {Summary} / {summary}')).toEqual(['title', 'summary']);
    });

    it('substitutes fields case-insensitively and keeps unknown placeholders', () => {
        const values = new Map([
            ['title', 'FIT-282'],
            ['summary', 'Update password'],
        ]);
        expect(applyRenderTemplate('{TITLE} — { summary } {missing}', values))
            .toBe('FIT-282 — Update password {missing}');
    });

    it('substitutes known empty values', () => {
        const values = new Map([['summary', '']]);
        expect(applyRenderTemplate('Before{summary}After', values)).toBe('BeforeAfter');
    });

    it('falls back to the title when the rendered label is blank', () => {
        const values = new Map([['summary', '']]);
        expect(renderTemplateLabel('{summary}', values, 'FIT-282')).toBe('FIT-282');
    });
});
