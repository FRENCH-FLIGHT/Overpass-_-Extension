# 🚀 Overpass – Page Freedom

**Overpass** is a professional browser extension that restores your control over web pages. It bypasses artificial restrictions, giving you back the freedom to interact with any content the way you choose.

---

## 🌟 Key Features

### 🖱️ Mouse & Content Control
- **Right-Click Restoration** — re-enables the native context menu on sites that disable it
- **Text Selection** — allows you to highlight and copy text anywhere
- **Visible Cursor** — forces your cursor to stay visible even when hidden by scripts
- **Click-Through Overlays** — makes content clickable under blocking popup windows

### 📋 Clipboard & Keyboard
- **Smart Clipboard** — restores Copy, Cut & Paste (Ctrl+C/X/V) everywhere
- **Keyboard Shortcuts** — prevents websites from hijacking your browser shortcuts
- **Focus Protection** — stops sites from stealing your input focus automatically

### 📜 Page Behaviour
- **Drag & Drop** — re-enables dragging of images, links and files
- **Scroll Unlock** — removes artificial scroll locks set by pages
- **Print Freedom** — allows printing or saving as PDF on restricted pages
- **Always Visible** — keeps the site from detecting you've switched tabs
- **Auto Overlay Removal** — automatically detects and hides paywalls and blocking modals

### ⚙️ Advanced
- **DevTools Protection** — prevents sites from detecting when you open developer tools
- **Console Guard** — stops pages from clearing your console history
- **Custom Scripts** — run your own JavaScript automatically on any page, at the timing you choose


---

## 🚀 Installation

### ✅ Easy install — Chrome Extension Package (.crx)
1. Download the latest **`overpass.crx`** from the [Releases](../../releases) page
2. Go to `chrome://extensions/`
3. Enable **Developer Mode** (toggle, top-right)
4. **Drag and drop** the `.crx` file onto the extensions page
5. Click **Add extension** in the confirmation dialog

> **Note:** If Chrome blocks the drag-and-drop, use the manual install below.

### 🛠️ Manual install (unpacked)
1. Download and extract the ZIP from the [Releases](../../releases) page
2. Go to `chrome://extensions/`
3. Enable **Developer Mode**
4. Click **Load unpacked** and select the extracted folder

### Firefox
1. Go to `about:debugging` → **This Firefox**
2. Click **Load Temporary Add-on** → select `manifest.json`

> Firefox support requires version 128+

---

## 🖥️ Interface

The popup is organised into **4 tabs**:

| Tab | What it does |
|-----|-------------|
| **Protections** | Toggle each bypass on or off individually |
| **Overlays** | View and restore elements hidden by the extension |
| **Scripts** | Create, edit and manage custom JavaScript snippets |
| **Settings** | Language, theme, save your own defaults, export/import a full backup, factory reset |

**Quick actions** in the toolbar:
- **Enable All / Disable All** — one-click toggle of all protections
- **Pick** — click any element on the page to hide it (Escape to cancel)
- Each protection category also has its own group switch, to enable or disable a whole category (e.g. all mouse-related protections) in a single click
- A banner under the header lets you disable Overpass entirely on the current site, with no need to touch individual toggles — manage your excluded sites anytime from the Settings tab
- Global keyboard shortcuts (configurable at `chrome://extensions/shortcuts`) let you toggle everything, or just the current site, without opening the popup at all

---

## ⚠️ Known Limitations
- Browser internal pages (`chrome://`, `about:`) cannot be modified
- Content gated server-side (never sent to your browser) cannot be recovered
- DevTools bypass is marked experimental — some very advanced detection methods may still work
- Excluding a site disables Overpass on that domain, but third-party content embedded from a *different* domain (e.g. some ads or widgets) is matched separately, since each is its own security context

---

## 📜 License

MIT License — for personal use and accessibility purposes.  
Users are responsible for complying with the terms of service of websites they visit.

---

## 📋 Changelog

### v3.3.0 — Experimental
- **New** — Global keyboard shortcuts: toggle all protections, or toggle exclusion on the current site, without opening the popup. Customize them anytime at `chrome://extensions/shortcuts` (path is shown — and copyable — in the Settings → About section)
- **Fix** — custom scripts set to run once the page is fully loaded could occasionally re-run when an unrelated setting was changed; they now only run once per page load as intended
- General cleanup and small reliability improvements

### v3.2.0
- **New** — Export/Import: save a full backup of your settings (protections, custom scripts, excluded sites) to a file, and restore it anytime from the Settings tab
- General cleanup and small reliability improvements

### v3.1.0 - Stable
- **New** — Site exclusion: disable Overpass entirely on the current site with one switch in a new banner under the header, manage the full list anytime from the Settings tab
- **Important fix** — settings changes made from the popup could still silently fail to apply without a page reload in some cases; this is now fully resolved
- General cleanup and small reliability improvements

### v3.0.4
- Example script snippets now insert content in the selected interface language instead of always in French
- Reduced unnecessary data written on every settings change, for better reliability on slow connections
- A few more leftover French texts fixed across the interface
- General cleanup and small reliability improvements

### v3.0.3
- Added a manual "Scan page" action in the Overlays tab, to re-check the page for blocking elements on demand
- Fixed a few more interface texts (placeholders, button tooltips, example script labels) that weren't following the selected language
- General cleanup and small reliability improvements

### v3.0.2
- Fixed several interface messages that stayed in French regardless of the selected language
- Fixed a missing keyboard focus indicator on one of the settings controls
- Minor performance optimization on pages with complex component structures
- General cleanup and small reliability improvements

### v3.0.1
- Fixed an issue where toggling a protection on or off in the popup would not take effect on the current page until it was manually reloaded — changes now apply instantly
- Fixed a display issue where enabling the cursor protection could make the mouse cursor disappear on text-heavy pages (e.g. search results), showing a text caret instead
- Refreshed interface: lighter, faster-loading design with no external font dependency
- Added quick group-level switches to enable or disable a whole category of protections at once
- General bug fixes and stability improvements

### v3.0.0
- **Major release** — significant expansion of bypass coverage and reliability
- New protections against advanced content-restriction techniques used by modern websites
- Improved compatibility with sites using isolated component architectures (Web Components)
- Continued performance and stability work across all bypass layers

### v2.2.9
- Bug fixes and reliability improvements
- Enhanced bypass effectiveness
- Performance improvements

### v2.2.8
- **Stealth** — `nativeToStr` now uses a WeakMap + single `Function.prototype.toString` patch: patched functions no longer have an own `toString` property (`hasOwnProperty('toString') === false`), indistinguishable from native functions
- **New bypass** — `Selection.prototype.toString` protected: some sites override it to return `''` and silently empty copied text even when selection is visible
- **Bugfix** — debounce timers (`_debTimer`, `_ovlDebTimer`) not cleared in `teardown()`, causing residual callbacks after deactivation
- Performance: `Object.entries(ON)` cached as `_ON_ENTRIES` at module level
- `autoRemoveOverlays` calls `N.setProp` directly, avoiding self-interception through patched `setProperty`

### v2.2.7
- **Bugfix** — `console.log` was never restored when Console Protection was disabled
- **Bugfix** — `pointerdown`/`keydown` listeners for focus tracking were never removed by `teardown()`, leaving permanent traces
- **Bugfix** — `history.pushState`/`replaceState` were double-wrapped on each reactivation after teardown (now guarded with `_spaHooked` flag)
- **Bugfix** — `document.hidden`, `visibilityState` overrides were never restored when visibility bypass was disabled
- **New** — `window.matchMedia('print')` intercepted to prevent paywall sites from detecting print attempts
- Performance: `patchFocus`, `patchScroll`, `patchVisibility`, `patchConsole` now skip on unchanged state (no redundant re-assignment on every `applyAll`)
- `teardown()` now fully restores focus, scroll, visibility, console and matchMedia to native

### v2.2.6
- **Zero trace when inactive** — when all features are disabled, the extension performs a full `teardown()`: L4 event sentinels removed from the DOM, MutationObserver disconnected, SPA polling interval cleared, injected `<style>` removed, native `addEventListener` restored, `selectionchange` listener removed, all CSS prototype patches restored to native
- `anyActive()` gate on `applyAll()` and the bootstrap — if everything is off at startup, only `lockPatches()` runs (transparent L1 guard, no DOM or observer overhead)
- L4 sentinels are now deferred: created in memory at init, registered/removed dynamically based on active state
- On re-activation after teardown, all machinery restarts cleanly

### v2.2.5
- **Security** — overlay picker no longer sets detectable DOM attributes (`data-ua-ov-id`); replaced with an invisible WeakMap
- **Bugfix** — L2 `addEventListener` wrapper now uses a composite key (function + capture flag), fixing rare `removeEventListener` mismatches
- **New** — `document.designMode = 'on'` now intercepted when text selection bypass is active (previously bypassed `user-select`)
- **Performance** — overlay list postMessage debounced 50 ms; `validatePayload` short-circuits before `JSON.stringify`
- Internal overlay hide calls native `setProperty` directly, avoiding self-interception

### v2.2.4
- **Critical bugfix** — scroll jank on all pages resolved: L4 event sentinels were registered with `passive:false` on `wheel`/`touchmove` unconditionally, forcing the browser to suspend scroll optimization on every page even with everything disabled
- **Critical bugfix** — video players and framework pages broken: `lockPatches()` was locking `EventTarget.prototype.addEventListener` as non-writable, silently breaking zone.js (Angular), Vue reactivity, and video SDK initialisation
- `lockPatches` switched to accessor guard `{get, set:noop, configurable:true}` — less detectable, same protection against simple reassignment
- Internal message bus channels renamed to generic identifiers (less fingerprintable in MAIN world)
- `setProperty` hot path optimised: direct string comparison instead of regex

### v2.2.3
- **Security hardening** — L1/L2 bypass layers locked at startup, impossible to overwrite even via fresh iframe prototype restoration
- Inline style `!important` attacks (`setProperty` with `user-select:none`) now intercepted
- `adoptedStyleSheets` vector covered (`replaceSync`/`replace` patched)

### v2.2.2
- **Stability & effectiveness improvements** — additional bypass coverage without site breakage
- Selection change events now intercepted alongside select-start
- Scroll bypass extended to `scrollTo`/`scrollBy` programmatic calls (sites that force-scroll back to top)
- CSS live-lock: `insertRule` patched surgically — only global `*`/`body`/`html` rules re-adding `user-select:none` or `cursor:none` are blocked
- SPA navigation fallback: URL polling at 1 Hz covers frameworks that bypass History API
- Security: postMessage payload capped at 64 KB
- Performance: inline-handler selector string cached at module level

### v2.2.1
- **Stability improvements** — overlay auto-remove now preserves legitimate modals containing forms or interactive elements
- **Performance** — CSS injection cached (no DOM update if unchanged), overlay detection deferred to browser idle time
- **Visibility bypass** — `document.hasFocus()` now also spoofed

### v2.2.0
- **Major performance overhaul** — resolved critical memory leak causing 3GB+ RAM usage and browser crashes on media-heavy sites
- **Removed Cookie Manager and Resource Viewer panels** — replaced by native browser DevTools (F12 → Application / Network); this eliminates the need to intercept all network requests, dramatically reducing memory and CPU usage
- **Bug fixes** — resolved multiple bypass interactions that caused breakage on complex web pages
- **Improved reliability** of all bypass layers

### v2.1.0
- **Cookie Manager** — full floating panel with create / edit / delete / export / import
- **Resource & Script Viewer** — real-time XHR, Fetch, Script, CSS and Image tracker with block, view and download
- **Floating panels in Shadow DOM** — panels are injected directly into the page and are invisible to detection scripts
- **Cancel overlay picker** — press Escape or click the button again to cancel pick mode
- **Drag & Drop fix** — complete rewrite of the drag & drop bypass, now works on all sites
- **Security: authenticated message bus** — all internal messages require a rotating secret token; forged messages are silently ignored
- **Security: XSS-safe popup** — all user-controlled data is rendered via `textContent`, never `innerHTML`
- **Performance: debounced MutationObserver** — mutations are batched over 120 ms instead of firing on every DOM change
- **SPA navigation support** — bypasses are automatically re-applied after client-side route changes (React, Vue, Angular…)
- **CSS live-lock** — prevents pages from re-injecting restrictive CSS rules via `insertRule`
- **Periodic re-application** — a lightweight background sweep counters sites that restore restrictions on a timer
- **4-language UI** — French, English, Spanish, German
- **Light / Dark theme** — toggle in header or in Settings
- **Save custom defaults** — save your preferred configuration and restore it anytime
- **Factory reset** — restores the original extension configuration and removes all custom scripts

### v2.0.0
- Complete bypass engine rewrite (9 layers, Manifest V3, MAIN world injection)
- Overlay manager with visual picker and restore list
- Custom user scripts with 3 execution phases
- i18n system (4 languages)
- Dark / Light theme
- User-defined default settings + factory reset

### v1.0.0
- Initial release: right-click, text selection, clipboard, keyboard shortcuts, drag & drop, scroll unlock, print, cursor restore, auto overlay removal
