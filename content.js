/**
 * Overpass v4.0.1 – content.js  (ISOLATED world, run_at: document_start)
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

  // BUS_IN_FIXED/BUS_OUT_FIXED sont partagés par toute installation de
  // l'extension — voir le commentaire détaillé dans inject.js. Une fois le
  // busKey lu depuis chrome.storage.local (propre à cette installation,
  // régénéré à chaque démarrage du navigateur), tout le trafic normal
  // bascule vers un canal dérivé, jamais partagé entre utilisateurs. Le
  // canal fixe reste accepté indéfiniment en secours.
  const BUS_IN_FIXED  = '__wm0__';  // content  → inject
  const BUS_OUT_FIXED = '__wm1__';  // inject   → content
  let BUS_IN_SESSION  = null;
  let BUS_OUT_SESSION = null;
  let busKey = null;

  function currentBusIn()  { return BUS_IN_SESSION  || BUS_IN_FIXED; }

  // Codes d'action courts et non descriptifs pour le canal postMessage —
  // remplacent des noms explicites ('update', 'getState'…) qui, une fois
  // le canal découvert, documenteraient directement la structure du
  // protocole. Les noms de CES constantes n'ont pas d'importance pour le
  // résultat livré (ils sont raccourcis par le mangling au build) : seule
  // la VALEUR de chaque code compte, et doit rester strictement identique
  // à celle utilisée dans inject.js.
  const A_INIT = 'j1', A_UPDATE = 'j2', A_RM_OVERLAYS = 'j3', A_RS_OVERLAY = 'j4',
        A_RS_ALL = 'j5', A_PICK_ON = 'j6', A_PICK_OFF = 'j7', A_GET_STATE = 'j8';
  const R_READY = 'k1', R_OVERLAY_LIST = 'k2', R_STATE = 'k3', R_PICK_DONE = 'k4', R_PICK_CANCEL = 'k5';

  const DEFAULTS = {
    contextmenu: true, selectstart: true, clipboard: true, keyboard: true,
    dragdrop: true, scroll: false, cursor: true, pointerEvents: false,
    print: true, overlays: false, devtools: false, consoleProtect: false,
    focus: false, visibility: true, zoom: true, darkMode: false,
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
    const msg = { __ch: currentBusIn(), __t: token, action, payload };
    // Le tout premier message porte le busKey (si connu) pour qu'inject.js
    // bascule sur le canal propre à cette installation — après quoi tout
    // le trafic, y compris celui-ci une fois envoyé, utilise ce canal.
    // __ch ci-dessus a déjà été figé sur le canal fixe pour CE message
    // précis (BUS_IN_SESSION est encore null au moment du calcul ci-dessus),
    // ce qui est le comportement voulu : inject.js n'écoute que le canal
    // fixe tant qu'il n'a pas reçu ce busKey.
    if (busKey && !BUS_IN_SESSION) {
      msg.__bus = busKey;
      BUS_IN_SESSION  = '__wm0_' + busKey;
      BUS_OUT_SESSION = '__wm1_' + busKey;
    }
    window.postMessage(msg, window.location.origin || '*');
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
    if (action === A_INIT && !ready) { pending = payload; return; }
    toInject(action, payload);
  }

  // ── Écoute des messages de inject.js ───────────────────────────
  function setupMessageListener() {
    window.addEventListener('message', e => {
      if (!e.data) return;
      const ch = e.data.__ch;
      if (ch !== BUS_OUT_FIXED && ch !== BUS_OUT_SESSION) return;
      const { action, payload } = e.data;

      // Signal prêt
      if (action === R_READY) {
        ready = true;
        if (pending) { toInject(A_INIT, pending); pending = null; }
        return;
      }

      // Relais vers le popup — chrome.runtime n'est jamais exposé au
      // contexte de la page, donc pas besoin d'y garder les codes courts :
      // on retraduit vers des noms explicites que popup.js reconnaît déjà.
      const relay = {
        [R_OVERLAY_LIST]: 'overlayList',
        [R_STATE]: 'state',
        [R_PICK_DONE]: 'pickerDone',
        [R_PICK_CANCEL]: 'pickerCancelled',
      }[action];
      if (relay) {
        try { chrome.runtime.sendMessage({ action: relay, payload }); } catch (_) {}
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
        pushToInject(A_INIT);
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
        pushToInject(A_UPDATE);
        reply({ ok: true });
        break;
      }

      case 'getSettings':
        reply({ settings: current });
        break;

      case 'removeOverlays':     toInject(A_RM_OVERLAYS);                     reply({ ok: true }); break;
      case 'restoreOverlay':     toInject(A_RS_OVERLAY,  { id: msg.id });     reply({ ok: true }); break;
      case 'restoreAllOverlays': toInject(A_RS_ALL);                          reply({ ok: true }); break;
      case 'activatePicker':     toInject(A_PICK_ON);                         reply({ ok: true }); break;
      case 'cancelPicker':       toInject(A_PICK_OFF);                        reply({ ok: true }); break;
      case 'getState':           toInject(A_GET_STATE);                       reply({ ok: true }); break;
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
      toInject(A_UPDATE, { lang: current.lang });
    }

    if (changes.excludedSites) {
      const list = Array.isArray(changes.excludedSites.newValue) ? changes.excludedSites.newValue : [];
      const wasExcluded = current.excluded;
      current.excluded = hostInList(location.hostname, list);
      if (current.excluded !== wasExcluded) pushToInject(A_UPDATE);
    }

    if (changes.siteProfiles) {
      const profiles = changes.siteProfiles.newValue;
      const rawProfile = (profiles && typeof profiles === 'object') ? findSiteProfile(location.hostname, profiles) : null;
      const next = sanitizeProfile(rawProfile);
      const changed = JSON.stringify(next) !== JSON.stringify(current.siteOverride);
      current.siteOverride = next;
      if (changed) pushToInject(A_UPDATE);
    }
  });

  // ── Initialisation ──────────────────────────────────────────────
  async function init() {
    const { __op_token, __op_bus } = await chrome.storage.local.get(['__op_token', '__op_bus']);
    token = __op_token || null;
    busKey = (typeof __op_bus === 'string' && /^[a-f0-9]{16,32}$/.test(__op_bus)) ? __op_bus : null;

    setupMessageListener();
    loadAndApply();

    // Fallback si le signal 'ready' est manqué (race condition au démarrage)
    setTimeout(() => {
      if (!ready && pending) { ready = true; toInject(A_INIT, pending); pending = null; }
    }, 700);
  }

  init();
})();
