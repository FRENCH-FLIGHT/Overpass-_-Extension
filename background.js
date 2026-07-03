/**
 * Overpass v3.4.1 – background.js (Service Worker)
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
      siteProfiles: {},
    });
  }
  updateAllBadges();
});

// Regénère le token à chaque démarrage du navigateur
chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.set({ __op_token: generateToken() });
  updateAllBadges();
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
// Le badge reflète désormais l'état RÉEL de chaque onglet, pas seulement
// les réglages globaux : site exclu (gris, tiret), profil de site actif
// (violet, compte du profil), ou réglages globaux (vert si actif).
const BADGE_COLOR_ACTIVE   = '#22c55e';
const BADGE_COLOR_PROFILE  = '#a78bfa';
const BADGE_COLOR_NEUTRAL  = '#64748b';

function hostnameOf(url) {
  try { return new URL(url).hostname || ''; } catch (_) { return ''; }
}

async function updateBadge(tabId) {
  if (!tabId) return;
  try {
    const tab  = await chrome.tabs.get(tabId);
    const host = tab?.url ? hostnameOf(tab.url) : '';
    const stored = await chrome.storage.sync.get({
      ...FACTORY_DEFAULTS,
      excludedSites: [],
      siteProfiles: {},
    });

    const excludedSites = Array.isArray(stored.excludedSites) ? stored.excludedSites : [];
    if (host && excludedSites.includes(host)) {
      await chrome.action.setBadgeText({ text: '–', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_NEUTRAL, tabId });
      return;
    }

    const siteProfiles = (stored.siteProfiles && typeof stored.siteProfiles === 'object') ? stored.siteProfiles : {};
    const profile = host ? siteProfiles[host] : null;
    const effective = (profile && typeof profile === 'object') ? { ...stored, ...profile } : stored;
    const active = Object.keys(FACTORY_DEFAULTS).filter(k => effective[k]).length;

    await chrome.action.setBadgeText({ text: active > 0 ? String(active) : '', tabId });
    await chrome.action.setBadgeBackgroundColor({
      color: profile ? BADGE_COLOR_PROFILE : (active > 0 ? BADGE_COLOR_ACTIVE : BADGE_COLOR_NEUTRAL),
      tabId,
    });
  } catch (_) {
    // Onglet introuvable (fermé entre-temps) ou page sans accès — rien à faire
  }
}

async function updateAllBadges() {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(t => updateBadge(t.id));
  } catch (_) {}
}

chrome.tabs.onActivated.addListener(({ tabId }) => updateBadge(tabId));
// La navigation change le hostname de l'onglet (donc son éventuelle
// exclusion/profil) sans forcément déclencher de changement de storage —
// on réévalue le badge à chaque fin de chargement de page.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url) updateBadge(tabId);
});
// Le badge dépendant désormais de données par-onglet (exclusion, profil),
// un changement de réglages peut affecter plusieurs onglets à la fois —
// on réévalue donc tous les onglets plutôt que le seul onglet actif.
chrome.storage.onChanged.addListener(() => updateAllBadges());

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
