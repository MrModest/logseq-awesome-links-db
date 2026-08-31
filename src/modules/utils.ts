//@ts-ignore
import { hasBadContrast } from 'color2k';
import { doc } from './globals';

export const objectDiff = (orig: object, updated: object) => {
    const difference = Object.keys(orig).filter((key) => {
        // @ts-ignore
        return orig[key] !== updated[key]
    });
    return difference;
}

// Generate Base64 from image URL
export const getBase64FromUrl = async (url: string): Promise<string> => {
    let data;
    try {
        data = await fetch(url);
    } catch (error) {
        return '';
    }
    // A favicon service answers for a host it cannot see with an error page,
    // which would otherwise be handed to an <img> as a text/html data URI
    if (!data.ok) {
        return '';
    }
    const blob = await data.blob();
    if (!blob.type.startsWith('image/')) {
        return '';
    }
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data);
        }
    });
}

export const isNeedLowContrastFix = (color: string, bg: string) => {
    return hasBadContrast(color, 'decorative', bg) ? true : false;
}

export const injectPluginCSS = (iframeId: string, label: string, cssContent: string) => {
    const pluginIframe = doc.getElementById(iframeId) as HTMLIFrameElement;
    if (!pluginIframe) {
        return
    }
    ejectPluginCSS(iframeId, label);
    pluginIframe.contentDocument?.head.insertAdjacentHTML(
        'beforeend',
        `<style id='${label}'>
            ${cssContent}
        </style>`
    );
}

export const ejectPluginCSS = (iframeId: string, label: string) => {
    const pluginIframe = doc.getElementById(iframeId) as HTMLIFrameElement;
    if (!pluginIframe) {
        return;
    }
    pluginIframe.contentDocument?.getElementById(label)?.remove();
}
