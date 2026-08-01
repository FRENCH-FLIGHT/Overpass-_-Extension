/**
 * Overpass v3.7.0 – content.js  (ISOLATED world, run_at: document_start)
 *
 * Rôle : pont sécurisé entre chrome.storage/runtime et inject.js (MAIN world).
 *
 * Sécurité postMessage :
 *   Le token est lu depuis chrome.storage.local — inaccessible aux scripts
 *   de la page — et inclus dans chaque message envoyé à inject.js.
 *   Inject.js le valide et rejette tout message sans token valide.
 */
(function () {
  'use strict';

  const BUS_IN  = '__wm0__';  // content  → inject
  const BUS_OUT = '__wm1__';  // inject   → content

  const DEFAULTS = {
    contextmenu: true, selectstart: true, clipboard: true, keyboard: true,
    dragdrop: true, scroll: false, cursor: true, pointerEvents: false,
    print: true, overlays: false, devtools: false, consoleProtect: false,
    focus: false, visibility: true,
  };

  let token   = null;
  let current = { ...DEFAULTS, customScripts: [], lang: 'fr', excluded: false, siteOverride: null };
  let ready   = false;
  let pending = null;

  // Ne garde que les clés DEFAULTS d'un profil de site lu depuis le storage.
  function sanitizeProfile(p) {
    if (!p || typeof p !== 'object') return null;
    const safe = {};
    let any = false;
    Object.keys(DEFAULTS).forEach(k => { if (k in p) { safe[k] = !!p[k]; any = true; } });
    return any ? safe : null;
  }

  // Fait correspondre un hostname à un motif "exemple.com" (exact) ou
  // "*.exemple.com" (ce domaine + tous ses sous-domaines) — même sémantique
  // que matchesSite() côté inject.js pour les scripts personnalisés, pour
  // que sites exclus et profils de site supportent eux aussi les wildcards.
  function hostMatchesPattern(host, pattern) {
    if (!host || typeof pattern !== 'string') return false;
    const p = pattern.trim().toLowerCase();
    if (!p) return false;
    const h = host.toLowerCase();
    if (p.startsWith('*.')) {
      const base = p.slice(2);
      return !!base && (h === base || h.endsWith('.' + base));
    }
    return h === p;
  }

  function hostInList(host, list) {
    return Array.isArray(list) && list.some(entry => hostMatchesPattern(host, entry));
  }

  // Résout le profil applicable à un hostname : correspondance exacte
  // prioritaire, sinon le motif wildcard le plus spécifique (base la plus
  // longue) parmi ceux qui matchent.
  function findSiteProfile(host, profiles) {
    if (!host || !profiles || typeof profiles !== 'object') return null;
    if (profiles[host]) return profiles[host];
    let best = null, bestLen = -1;
    Object.keys(profiles).forEach(key => {
      const p = key.trim().toLowerCase();
      if (!p.startsWith('*.')) return;
      const base = p.slice(2);
      if (base && hostMatchesPattern(host, key) && base.length > bestLen) {
        best = profiles[key];
        bestLen = base.length;
      }
    });
    return best;
  }

  // ── Envoi sécurisé vers inject.js ──────────────────────────────
  function toInject(action, payload = {}) {
    if (!token) return;
    window.postMessage({ __ch: BUS_IN, __t: token, action, payload }, window.location.origin || '*');
  }

  // ── Charge utile effective envoyée à inject.js ───────────────────
  // Si ce site (location.hostname) figure dans excludedSites, on envoie un
  // état "tout désactivé" plutôt que les réglages réels : inject.js retombe
  // alors naturellement sur teardown() (zéro trace), sans qu'aucune logique
  // d'exclusion n'ait besoin d'exister côté inject.js. L'exclusion prime
  // toujours sur un éventuel profil de site (priorité claire, sans ambiguïté).
  // Sinon, si un profil existe pour ce site, ses clés écrasent les valeurs
  // globales correspondantes — sans jamais ajouter de clé supplémentaire au
  // payload (siteOverride ne contient que des clés déjà présentes dans rest).
  function effectivePayload() {
    if (current.excluded) {
      const off = {};
      Object.keys(DEFAULTS).forEach(k => { off[k] = false; });
      return { ...off, customScripts: [], lang: current.lang };
    }
    // 'excluded' et 'siteOverride' sont des drapeaux internes à content.js —
    // ils ne font pas partie de ALLOWED_KEYS côté inject.js et doivent être
    // retirés avant l'envoi, sinon validatePayload() rejette le message.
    const { excluded, siteOverride, ...rest } = current;
    return siteOverride ? { ...rest, ...siteOverride } : rest;
  }

  function pushToInject(action) {
    const payload = effectivePayload();
    if (action === 'init' && !ready) { pending = payload; return; }
    toInject(action, payload);
  }

  // ── Écoute des messages de inject.js ───────────────────────────
  function setupMessageListener() {
    window.addEventListener('message', e => {
      if (!e.data || e.data.__ch !== BUS_OUT) return;
      const { action, payload } = e.data;

      // Signal prêt
      if (action === 'ready') {
        ready = true;
        if (pending) { toInject('init', pending); pending = null; }
        return;
      }

      // Overlay list → popup
      if (action === 'overlayList' || action === 'state') {
        try { chrome.runtime.sendMessage({ action, payload }); } catch (_) {}
        return;
      }
    });
  }

  // ── Chargement des settings depuis storage ──────────────────────
  function loadAndApply() {
    chrome.storage.sync.get(
      { ...DEFAULTS, customScripts: '[]', language: 'fr', excludedSites: [], siteProfiles: {} },
      raw => {
        let scripts = [];
        try { scripts = JSON.parse(raw.customScripts ?? '[]'); } catch (_) {}
        // Retirer les clés non-toggle pour rester dans ALLOWED_KEYS côté inject.js.
        const { language, customScripts: _rawScripts, excludedSites, siteProfiles, ...toggles } = raw;
        const excluded = Array.isArray(excludedSites) && hostInList(location.hostname, excludedSites);
        const rawProfile = (siteProfiles && typeof siteProfiles === 'object') ? findSiteProfile(location.hostname, siteProfiles) : null;
        current = {
          ...DEFAULTS, ...toggles, customScripts: scripts, lang: language || 'fr',
          excluded, siteOverride: sanitizeProfile(rawProfile),
        };
        pushToInject('init');
      }
    );
  }

  // ── Messages du popup → forward vers inject.js ──────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    switch (msg.action) {

      case 'updateSettings': {
        const scripts = msg.settings.customScripts ?? current.customScripts;
        current = { ...current, ...msg.settings, customScripts: scripts };
        if (msg.settings.language !== undefined) current.lang = msg.settings.language;
        // Pas d'écriture storage ici : tous les appelants de 'updateSettings'
        // (popup.js, background.js) persistent déjà eux-mêmes. content.js
        // n'a qu'à appliquer en direct sur la page.
        pushToInject('update');
        reply({ ok: true });
        break;
      }

      case 'getSettings':
        reply({ settings: current });
        break;

      case 'removeOverlays':     toInject('removeOverlays');                     reply({ ok: true }); break;
      case 'restoreOverlay':     toInject('restoreOverlay',  { id: msg.id });    reply({ ok: true }); break;
      case 'restoreAllOverlays': toInject('restoreAllOverlays');                 reply({ ok: true }); break;
      case 'activatePicker':     toInject('activatePicker');                     reply({ ok: true }); break;
      case 'cancelPicker':       toInject('cancelPicker');                       reply({ ok: true }); break;
      case 'getState':           toInject('getState');                           reply({ ok: true }); break;
      case 'ping':               reply({ pong: true }); break;
    }
    return true;
  });

  // ── Synchronisation langue / exclusion / profil de site ──────────
  // Fusionnés en un seul listener storage.onChanged (au lieu de trois) :
  // chaque changement de storage ne réveille ainsi qu'un seul callback,
  // qui ignore les clés qui ne le concernent pas.
  //
  // - Langue : peut être changée depuis le popup sans toucher aux toggles
  //   (donc sans passer par 'updateSettings').
  // - Exclusion / profil de site : le popup écrit directement dans
  //   chrome.storage.sync (il connaît le hostname de l'onglet actif sans
  //   passer par content.js) — chaque frame réévalue ici si SON PROPRE
  //   location.hostname est concerné, ce qui couvre aussi les autres
  //   onglets ouverts sur le même site.
  chrome.storage.onChanged.addListener(changes => {
    if (changes.language) {
      current.lang = changes.language.newValue || 'fr';
      toInject('update', { lang: current.lang });
    }

    if (changes.excludedSites) {
      const list = Array.isArray(changes.excludedSites.newValue) ? changes.excludedSites.newValue : [];
      const wasExcluded = current.excluded;
      current.excluded = hostInList(location.hostname, list);
      if (current.excluded !== wasExcluded) pushToInject('update');
    }

    if (changes.siteProfiles) {
      const profiles = changes.siteProfiles.newValue;
      const rawProfile = (profiles && typeof profiles === 'object') ? findSiteProfile(location.hostname, profiles) : null;
      const next = sanitizeProfile(rawProfile);
      const changed = JSON.stringify(next) !== JSON.stringify(current.siteOverride);
      current.siteOverride = next;
      if (changed) pushToInject('update');
    }
  });

  // ── Initialisation ──────────────────────────────────────────────
  async function init() {
    const { __op_token } = await chrome.storage.local.get('__op_token');
    token = __op_token || null;

    setupMessageListener();
    loadAndApply();

    // Fallback si le signal 'ready' est manqué (race condition au démarrage)
    setTimeout(() => {
      if (!ready && pending) { ready = true; toInject('init', pending); pending = null; }
    }, 700);
  }

  init();
})();
