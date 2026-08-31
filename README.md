# Awesome Links DB

Icons and colors for links in **Logseq DB (V2)** graphs.

A DB-only fork of [yoyurec/logseq-awesome-links](https://github.com/yoyurec/logseq-awesome-links). File-graph support is removed.

## What it does

### Internal links inherit the icon and color of their tag

Logseq V2 stores a node's icon as `:logseq.property/icon`, a map of `{:type :tabler-icon :id "list-check" :color "#5e69d2"}` — the color is part of the icon value.

Logseq's own icon resolution checks a node's own icon, then the icon of its first tag. But for nodes tagged `#Page` — which is every page — the page branch is reached first and returns the generic `"file"` icon, which the link renderer then discards. In practice a page tagged `#Jira` shows no icon and no color.

This plugin fills that gap: a node with no icon of its own is rendered with the icon and color of its first user tag, ordered by `:db/id` the same way Logseq orders them. Built-in classes (`logseq.class/Page`, `logseq.class/Journal`, `logseq.class/Task`…) are skipped, so only your own tags act as a source.

Where a node already has its own icon, Logseq draws it and the plugin leaves it alone.

Icons render with Logseq's bundled Tabler webfont (`<i class="ti ti-...">`); emoji icons render through the app's `<em-emoji>` element. Neither is bundled with the plugin.

### Favicons for external links

Every external link gets the favicon of its host, cached per hostname. Optionally the link takes the color of the first tag or page ref inline with it.

## Settings

| Setting | Default | Effect |
|---|---|---|
| `faviconsEnabled` | on | Favicons for external links |
| `inheritExtColor` | on | External link takes the color of the first inline tag/ref |
| `pageIconsEnabled` | on | Icons and colors for internal links |
| `customIcons` | empty | Favicon rules for hosts no public resolver can see |
| `fixLowContrast` | off | Black/white text stroke on low-contrast link colors |

### Custom favicon rules

A private Confluence, an internal wiki or any other host behind a login is
invisible to the public favicon services, so it has no icon to find. Name those
hosts explicitly in `customIcons`, one rule per line:

```
atlassian.cloud.deliveryhero.group :: ti:notebook #0052CC
*.corp.example.com                 :: 📗
wiki.corp/handbook                 :: https://wiki.corp/logo.png
```

A match containing `/` is tested against the whole URL; otherwise it is a
hostname and covers its subdomains. An icon is a Tabler id prefixed `ti:` (the
ids the Logseq icon picker uses), an image URL, or any text or emoji. A trailing
hex value colors the icon. These rules are checked before the built-in ones, so
they can override any of them.

## Install

Not on the marketplace. Build it and load the folder:

```bash
pnpm install
pnpm build
```

Then in Logseq: `⋯` → **Plugins** → **Load unpacked plugin** → pick this directory. Developer mode must be on (`Settings` → `Advanced` → `Developer mode`).

`dist/` is gitignored, so a fresh clone needs `pnpm build` before it can be loaded.

## Where things live

| Path | Contains |
|---|---|
| `src/modules/pageIcons/queries.ts` | Datascript lookup and tag-inheritance resolution |
| `src/modules/pageIcons/pageIcons.ts` | Icon injection and link coloring |
| `src/modules/favIcons/` | External link favicons |
| `src/modules/linksObserver/` | MutationObserver that catches newly rendered links |
| `src/plugin/` | Bootstrap and settings schema |

## License

MIT, as upstream.
