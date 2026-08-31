import { LSPluginBaseInfo } from '@logseq/libs/dist/LSPlugin.user';
import { toggleFaviconsFeature, toggleInheritExtColor, reloadCustomIcons } from '../modules/favIcons/favIcons';
import { globals } from '../modules/globals';
import { toggleIconsFeature } from '../modules/pageIcons/pageIcons';

import { objectDiff } from '../modules/utils';

import { settingsConfig } from './settingsConfig';

export const settingsLoad = () => {
    logseq.useSettingsSchema(settingsConfig);
    globals.pluginConfig = logseq.settings;

    logseq.onSettingsChanged((settings, oldSettings) => {
        onSettingsChangedCallback(settings, oldSettings);
    });
 }

const onSettingsChangedCallback = (settings: LSPluginBaseInfo['settings'], oldSettings: LSPluginBaseInfo['settings']) => {
    globals.pluginConfig = { ...settings };
    const settingsDiff = objectDiff({ ...oldSettings }, globals.pluginConfig)
    if (settingsDiff.includes('faviconsEnabled')) {
        toggleFaviconsFeature();
    }
    if (settingsDiff.includes('inheritExtColor')) {
        toggleInheritExtColor();
    }
    if (settingsDiff.includes('customIcons')) {
        reloadCustomIcons();
        toggleFaviconsFeature();
    }
    if (settingsDiff.includes('pageIconsEnabled') || settingsDiff.includes('fixLowContrast')) {
        toggleIconsFeature();
    }
}
