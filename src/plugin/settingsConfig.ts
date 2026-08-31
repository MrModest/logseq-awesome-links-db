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
        key: 'customIconsHeading',
        title: 'Custom icons',
        description: 'Icons for hosts no public favicon service can see, such as a private Confluence or an internal wiki. Edit the settings file below and fill customIcons with an array of { match, icon, color } objects. A match containing / is tested against the whole URL, otherwise it is a hostname and covers its subdomains. An icon is a Tabler id prefixed ti: (the same ids the Logseq icon picker uses), an image URL, or any text or emoji. These rules take priority over the built-in ones.',
        type: 'heading',
        default: null,
    },
    {
        key: 'customIcons',
        title: 'Rules',
        description: 'For example: [{ "match": "dev.example.com", "icon": "ti:notebook", "color": "#0052CC" }]',
        type: 'object',
        default: [],
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
