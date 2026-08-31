import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user';

export const settingsConfig: SettingSchemaDesc[] = [
    {
        key: 'externalHeading',
        title: 'External links',
        description: '',
        type: 'heading',
        default: null,
    },
    {
        key: 'faviconsEnabled',
        title: '',
        description: 'Enable feature: favicons for external links?',
        type: 'boolean',
        default: true,
    },
    {
        key: 'inheritExtColor',
        title: '',
        description: 'Inherit link color from first inline tag/ref',
        type: 'boolean',
        default: true,
    },
    {
        key: 'internalHeading',
        title: 'Internal links',
        description: '',
        type: 'heading',
        default: null,
    },
    {
        key: 'pageIconsEnabled',
        title: '',
        description: 'Enable feature: show the node icon and color on internal links. A node without its own icon inherits from its first tag.',
        type: 'boolean',
        default: true,
    },
    {
        key: 'otherHeading',
        title: 'Other',
        description: '',
        type: 'heading',
        default: null,
    },
    {
        key: 'fixLowContrast',
        title: '',
        description: '⚠ Experimental: Enable text black/white stroke for low contrast links colors',
        type: 'boolean',
        default: false,
    },
];
