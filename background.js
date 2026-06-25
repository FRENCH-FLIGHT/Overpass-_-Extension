/**
 * Overpass v3.3.0 – background.js (Service Worker)
 *
 * Responsabilités :
 *   1. Génère et rotation du token d'authentification postMessage
 *   2. Proxy chrome.cookies → appelé par content.js
 *   3. Badge de l'icône
 */

const FACTORY_DEFAULTS = {
  contextmenu: true,  selectstart: true,  clipboard: true,  keyboard: true,
  dragdrop: true,     scroll: false,      cursor: true,     pointerEvents: false,
  print: true,        overlays: false,    devtools: false,  consoleProtect: false,
  focus: false,       visibility: true,
};

// ── Token de session ─────────────────────────────────────────────
function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.storage.local.set({ __op_token: generateToken() });
  if (reason === 'install') {
    await chrome.storage.sync.set({
      ...FACTORY_DEFAULTS,
      customScripts: '[]',
      language: 'fr',
      theme: 'dark',
      userDefaults: null,
      excludedSites: [],
    });
  }
});

// Regénère le token à chaque démarrage du navigateur
chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.set({ __op_token: generateToken() });
});

// ── Messages ─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  switch (msg.action) {

    case 'getFactoryDefaults':
      reply({ defaults: FACTORY_DEFAULTS });
      return true;

    default:
      return false;
  }
});

// ── Badge ────────────────────────────────────────────────────────
async function updateBadge(tabId) {
  try {
    const s = await chrome.storage.sync.get(FACTORY_DEFAULTS);
    const active = Object.keys(FACTORY_DEFAULTS).filter(k => s[k]).length;
    await chrome.action.setBadgeText({ text: active > 0 ? String(active) : '', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: active > 0 ? '#22c55e' : '#64748b', tabId });
  } catch (_) {}
}

chrome.tabs.onActivated.addListener(({ tabId }) => updateBadge(tabId));
chrome.storage.onChanged.addListener(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) updateBadge(tab.id);
});

// ── Raccourcis clavier (chrome.commands) ──────────────────────────
// Les combinaisons par défaut sont des suggestions : si elles entrent en
// conflit avec un raccourci déjà réservé par le navigateur, Chrome ne les
// active simplement pas — l'utilisateur peut alors les réassigner depuis
// chrome://extensions/shortcuts sans que cela affecte le reste de l'extension.
chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command === 'toggle-all') {
    try {
      const stored = await chrome.storage.sync.get(FACTORY_DEFAULTS);
      const anyOn = Object.keys(FACTORY_DEFAULTS).some(k => stored[k]);
      const next = {};
      Object.keys(FACTORY_DEFAULTS).forEach(k => { next[k] = !anyOn; });
      await chrome.storage.sync.set(next);
      // Application immédiate sur l'onglet actif (même schéma que le popup) ;
      // les autres onglets ouverts reprendront le nouvel état à leur prochain
      // chargement, ou via leur propre popup s'il est ouvert.
      if (tab?.id) {
        try { await chrome.tabs.sendMessage(tab.id, { action: 'updateSettings', settings: next }); } catch (_) {}
      }
    } catch (_) {}
    return;
  }

  if (command === 'toggle-site-exclusion') {
    if (!tab?.url) return;
    let hostname = '';
    try { hostname = new URL(tab.url).hostname; } catch (_) {}
    if (!hostname) return;
    try {
      const { excludedSites } = await chrome.storage.sync.get({ excludedSites: [] });
      const list = Array.isArray(excludedSites) ? excludedSites : [];
      const next = list.includes(hostname)
        ? list.filter(h => h !== hostname)
        : [...new Set([...list, hostname])];
      // content.js écoute déjà ce changement (storage.onChanged) dans chaque
      // onglet concerné — aucun message direct à envoyer ici.
      await chrome.storage.sync.set({ excludedSites: next });
    } catch (_) {}
  }
});
