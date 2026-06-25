/**
 * Overpass v3.3.0 – content.js  (ISOLATED world, run_at: document_start)
 *
 * Rôle : pont sécurisé entre chrome.storage/runtime et inject.js (MAIN world).
 *
 * Sécurité postMessage :
 *   Le token est lu depuis chrome.storage.local — inaccessible aux scripts
 *   de la page — et inclus dans chaque message envoyé à inject.js.
 *   Inject.js le valide et rejette tout message sans token valide.
 *
 * Note : les panels Cookie et Resource ont été retirés de l'extension (v2.2.0).
 * Le proxy cookies (background.js) et les handlers XHR/fetch (inject.js)
 * ont également été supprimés.
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
  let current = { ...DEFAULTS, customScripts: [], lang: 'fr', excluded: false };
  let ready   = false;
  let pending = null;

  // ── Envoi sécurisé vers inject.js ──────────────────────────────
  function toInject(action, payload = {}) {
    if (!token) return;
    window.postMessage({ __ch: BUS_IN, __t: token, action, payload }, window.location.origin || '*');
  }

  // ── Charge utile effective envoyée à inject.js ───────────────────
  // Si ce site (location.hostname) figure dans excludedSites, on envoie un
  // état "tout désactivé" plutôt que les réglages réels : inject.js retombe
  // alors naturellement sur teardown() (zéro trace), sans qu'aucune logique
  // d'exclusion n'ait besoin d'exister côté inject.js.
  function effectivePayload() {
    if (!current.excluded) {
      // 'excluded' est un drapeau interne à content.js — il ne fait pas partie
      // de ALLOWED_KEYS côté inject.js et doit être retiré avant l'envoi, sinon
      // validatePayload() rejette le message (cf. bug des clés en surnombre).
      const { excluded, ...rest } = current;
      return rest;
    }
    const off = {};
    Object.keys(DEFAULTS).forEach(k => { off[k] = false; });
    return { ...off, customScripts: [], lang: current.lang };
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
    chrome.storage.sync.get({ ...DEFAULTS, customScripts: '[]', language: 'fr', excludedSites: [] }, raw => {
      let scripts = [];
      try { scripts = JSON.parse(raw.customScripts ?? '[]'); } catch (_) {}
      // On exclut 'language' (et le customScripts brut, déjà parsé ci-dessus)
      // du spread de raw : sinon cette clé s'ajoute en surnombre dans current,
      // ce qui fait dépasser ALLOWED_KEYS côté inject.js et fait échouer
      // validatePayload() sur CHAQUE message 'update' — les cases cochées
      // n'avaient alors d'effet qu'après un rechargement complet de la page
      // (le message 'init', lui, n'est pas filtré par validatePayload).
      const { language, customScripts: _rawScripts, excludedSites, ...toggles } = raw;
      const excluded = Array.isArray(excludedSites) && excludedSites.includes(location.hostname);
      current = { ...DEFAULTS, ...toggles, customScripts: scripts, lang: language || 'fr', excluded };
      pushToInject('init');
    });
  }

  // ── Messages du popup → forward vers inject.js ──────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    switch (msg.action) {

      case 'updateSettings': {
        const scripts = msg.settings.customScripts ?? current.customScripts;
        current = { ...current, ...msg.settings, customScripts: scripts };
        if (msg.settings.language !== undefined) current.lang = msg.settings.language;
        chrome.storage.sync.set({ ...msg.settings, customScripts: JSON.stringify(scripts) });
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

  // ── Synchronisation langue ───────────────────────────────────────
  // La langue peut être changée depuis le popup sans toucher aux toggles
  // (donc sans passer par 'updateSettings'). On écoute storage.onChanged
  // pour répercuter le changement vers inject.js sans recharger la page.
  chrome.storage.onChanged.addListener(changes => {
    if (!changes.language) return;
    current.lang = changes.language.newValue || 'fr';
    toInject('update', { lang: current.lang });
  });

  // ── Synchronisation exclusion de site ────────────────────────────
  // Le popup écrit directement excludedSites dans chrome.storage.sync (il
  // connaît le nom d'hôte de l'onglet actif sans passer par content.js).
  // Chaque frame réévalue ici si SON PROPRE location.hostname est concerné —
  // ce qui couvre aussi les autres onglets ouverts sur le même site.
  chrome.storage.onChanged.addListener(changes => {
    if (!changes.excludedSites) return;
    const list = Array.isArray(changes.excludedSites.newValue) ? changes.excludedSites.newValue : [];
    const wasExcluded = current.excluded;
    current.excluded = list.includes(location.hostname);
    if (current.excluded !== wasExcluded) pushToInject('update');
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
