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
- **Auto Overlay Removal** — automatically detects and hides paywalls and blocking modals, and un-clips text visually truncated behind a "subscribe to read more" fade
- **Zoom** — restores pinch-to-zoom and page zoom when a site disables it

### 🌓 Display
- **Forced Dark Mode** — applies a dark theme to any site, even ones without native support

### ⚙️ Advanced
- **DevTools Protection** — prevents sites from detecting when you open developer tools
- **Console Guard** — stops pages from clearing your console history
- **Custom Scripts** — run your own JavaScript automatically on any page, at the timing you choose, optionally restricted to a specific site or domain

### 🌐 Network
- **Anti-Adblock-Detection Blocking** — optionally blocks a curated list of known scripts whose only purpose is detecting and defeating content blockers, at the network level, before they ever run (off by default — enable it from Settings)

### 🛟 Support
- **Update Check** — get notified right in the popup when a new version is available, with a direct link to it
- **Issue Reporting** — spotted a bypass that isn't working? Report it in one click, prefilled with the relevant context, directly on the project's GitHub page


---

## 🚀 Installation

### 🛠️ Chrome / Edge (unpacked)
1. Download and extract the ZIP from the [Releases](../../releases) page (or clone the repo)
2. Go to `chrome://extensions/`
3. Enable **Developer Mode** (toggle, top-right)
4. Click **Load unpacked** and select the extracted **`Overpass-v4.0.0/`** folder

### Firefox
1. Go to `about:debugging` → **This Firefox**
2. Click **Load Temporary Add-on** → select `manifest.json` inside the `Overpass-v4.0.0/` folder

> Firefox support requires version 128+

---

## 🖥️ Interface

The popup is organised into **4 tabs**:

| Tab | What it does |
|-----|-------------|
| **Protections** | Toggle each bypass on or off individually — quick presets at the top let you switch between common configurations instantly, and the popup may suggest one for you based on the page you're on |
| **Overlays** | View and restore elements hidden by the extension |
| **Scripts** | Create, edit and manage custom JavaScript snippets |
| **Settings** | Language, theme, save your own defaults, export/import a full backup, check for updates, report an issue, factory reset |

**Quick actions** in the toolbar:
- **Enable All / Disable All** — one-click toggle of all protections
- **Pick** — click any element on the page to hide it (Escape to cancel)
- Each protection category also has its own group switch, to enable or disable a whole category (e.g. all mouse-related protections) in a single click
- A banner under the header lets you disable Overpass entirely on the current site, with no need to touch individual toggles — manage your excluded sites anytime from the Settings tab, where you can also exclude a whole domain (all its subdomains included) at once
- The same banner lets you save the current settings as a profile for that site alone, distinct from your global settings
- Global keyboard shortcuts (configurable at `chrome://extensions/shortcuts`) let you toggle everything, or just the current site, without opening the popup at all

---

## ⚠️ Known Limitations
- Browser internal pages (`chrome://`, `about:`) cannot be modified
- Content gated server-side (never sent to your browser) cannot be recovered
- DevTools bypass is marked experimental — some very advanced detection methods may still work
- Excluding a site disables Overpass on that domain, but third-party content embedded from a *different* domain (e.g. some ads or widgets) is matched separately, since each is its own security context
- Forced Dark Mode works by inverting page colors — reliable almost everywhere, but `position: fixed` elements can occasionally look slightly off on some sites, a known trade-off of this technique
- The anti-adblock-detection blocklist is a small, curated starting point, not an exhaustive one — it will grow over time

---

## 📜 License

MIT License — for personal use and accessibility purposes.  
Users are responsible for complying with the terms of service of websites they visit.

---

## 📋 Changelog

### v4.0.2 — Current
- **Security** — Removed internal documentation comments from the source code to make it harder to study from the outside
- **Improved** — Expanded the anti-adblock-detection blocklist with more known scripts
- **Fixed** — The Zoom protection could occasionally keep restoring an already-removed page element instead of the current one on some dynamic pages
- **Fixed** — The network-blocking toggle in Settings could show a stale state when multiple popups were open, or after a factory reset
- **Fixed** — Exporting your settings now also includes the network-blocking preference, so restoring a backup doesn't leave it behind
- General cleanup and small reliability improvements

### v4.0.1
- The project is now distributed as plain, readable source — no build or install step needed to get from download to a working extension
- General cleanup and small reliability improvements

### v4.0.0
- **Major** — New "Forced Dark Mode" protection: apply a dark theme to any site, even without native support (off by default)
- **Major** — New optional network-level blocking of known anti-adblock-detection scripts, so they never get a chance to run — a curated starting list, off by default, enable it from Settings
- General cleanup and small reliability improvements

### v3.9.0
- **New** — A "Zoom" protection that restores pinch-to-zoom and page zoom on sites that disable it — a common accessibility issue, not just a paywall workaround
- **New** — Auto overlay removal now also un-clips text that's visually truncated behind a "subscribe to read more" fade, not just fully-hidden content
- Dropped the `.crx` install method — going forward, install as an unpacked folder (see Installation)
- General cleanup and small reliability improvements

### v3.8.3
- **Security** — The installable extension is now shipped in a compacted form that's significantly harder to read or pick apart, with the original, well-documented source kept separately for maintenance
- **Security** — Internal communication is now much harder for a site to detect or fingerprint, using identifiers unique to each installation instead of ones shared by every user of the extension
- **Security** — Internal messages are now labeled with short, meaningless codes instead of descriptive names, making the extension's internal protocol much harder to study from the outside
- **Security** — Removed an unused permission that could have let a site check whether Overpass is installed
- **Fixed** — The popup's "Pick" button could occasionally stay stuck in picking mode after selecting an element on the page
- General cleanup and small reliability improvements

### v3.8.0
- **New** — A fourth quick preset, "Video", tuned for streaming sites (keeps the player visible, unblocks scroll and clicks on overlays)
- **New** — The popup can now gently suggest a matching preset when it recognizes the kind of page you're on (an article, a video) — purely a suggestion, never applied without your click, and easy to dismiss
- General cleanup and small reliability improvements

### v3.7.0
- **New** — Excluding a site or saving a site profile now also accepts a whole domain (e.g. `*.example.com`) to cover all its subdomains at once, addable directly from Settings
- **Improved** — DevTools Protection now catches a widely-used detection method it was missing before, making it noticeably more effective
- **Fixed** — Turning off DevTools Protection now fully reverts it, instead of leaving some of it active until the page is reloaded
- **Fixed** — Reduced the chance of the DevTools Protection interfering with unrelated site behaviour
- **Improved** — Auto-hiding of popups now also catches ones that appear a few seconds after the page loads, not just ones present immediately
- **Improved** — Exporting your settings now also includes your saved defaults, so restoring a backup doesn't leave anything behind
- **Fixed** — Excluded sites, site profiles, and saved defaults now clearly warn you if a change couldn't be saved instead of failing silently
- **Fixed** — Factory reset now correctly clears the excluded sites and site profiles shown in Settings right away, instead of only after reopening the popup
- General cleanup and small reliability improvements

### v3.6.4
- **Fixed** — You're now warned if a change (like importing a backup with large custom scripts) is too big to be saved, instead of silently failing to persist
- General cleanup and small reliability improvements

### v3.6.3
- **Improved** — Smoother performance on single-page apps that navigate frequently, avoiding redundant work right after a page change
- General cleanup and small reliability improvements

### v3.6.2
- **Fixed** — Reduced memory usage during long browsing sessions, especially on single-page apps that add and remove a lot of content over time
- General cleanup and small reliability improvements

### v3.6.1
- **Improved** — Better coverage for scroll unlocking: keyboard scrolling (spacebar, arrow keys, page up/down) is now restored too, not just mouse wheel and touch
- **Improved** — Printing restoration is now more reliable against pages that specifically try to hide content when printing
- **Improved** — Auto-hiding of cookie banners and paywall overlays now catches more cases, including shorter banners anchored to the edge of the screen and elements built with modern web components
- General cleanup and small reliability improvements

### v3.6.0
- **New** — The report page now lets you pick which site the issue is about from a dropdown of your open tabs, instead of relying only on automatic detection
- **Improved** — Reports now include much more complete environment details automatically (exact browser version, operating system, and the full status of every protection) — you only need to fill in the title and description
- **Improved** — Update checks are now clearer about the difference between "no new version yet" and an actual connection problem
- General cleanup and small reliability improvements

### v3.5.5
- **Improved** — Issue reporting now opens a dedicated, full-page report form instead of going straight to GitHub: it shows the auto-detected context clearly (with a timestamp), lets you add your own description, and gives you a live preview before you send anything — nothing leaves your browser until you click "Open on GitHub" or "Copy report" yourself
- **Improved** — Your report is now saved automatically as you type, so accidentally closing the tab won't make you lose your work
- **Improved** — When an update is available, the button in Settings now takes you directly to that release's page on GitHub instead of just re-checking
- General cleanup and small reliability improvements

### v3.5.0
- **New** — Update check: the popup now tells you when a new version is available, with a direct link to it — a small indicator also appears next to the version number in the header
- **New** — Issue reporting: report a problem in one click from the Settings tab, or directly from a specific site's banner for context-aware reports — opens a prefilled ticket on the project's GitHub page, no data sent automatically
- General cleanup and small reliability improvements

### v3.4.1
- Bug fixes: the "Balanced" quick preset now correctly applies its settings
- Performance: reduced unnecessary background activity when changing settings
- General cleanup and small reliability improvements

### v3.4.0
- **New** — Custom scripts can now be restricted to a specific site or domain (e.g. `example.com` or `*.example.com`), instead of always running on every page — existing scripts are unaffected and keep running everywhere as before
- **New** — Site profiles: save a distinct combination of protections for a specific site, different from your global settings, using the icon in the banner at the top of the popup — manage saved profiles anytime from the Settings tab
- **New** — Quick presets at the top of the Protections tab: switch instantly between "Reading" (optimized for articles and paywalls), "Stealth" (minimal footprint), or "Balanced" (recommended defaults)
- **New** — The toolbar icon badge now reflects the actual state of the current tab: greyed out when the site is excluded, purple when a site profile is active, green count otherwise
- General cleanup and small reliability improvements

### v3.3.0
- **New** — Global keyboard shortcuts: toggle all protections, or toggle exclusion on the current site, without opening the popup. Customize them anytime at `chrome://extensions/shortcuts` (path is shown — and copyable — in the Settings → About section)
- **Fix** — custom scripts set to run once the page is fully loaded could occasionally re-run when an unrelated setting was changed; they now only run once per page load as intended
- General cleanup and small reliability improvements

### v3.2.0
- **New** — Export/Import: save a full backup of your settings (protections, custom scripts, excluded sites) to a file, and restore it anytime from the Settings tab
- General cleanup and small reliability improvements

### v3.1.0
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
