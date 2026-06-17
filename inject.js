/**
 * Overpass v3.0.0 – inject.js  (world:"MAIN", run_at:"document_start")
 *
 * COUCHES DE BYPASS :
 *  L1  Event.prototype override        ← le plus profond, touche tout
 *  L2  addEventListener wrapping       ← filet par listener (uses blocked())
 *  L3  on* defineProperty traps        ← assignations directes
 *  L4  Sentinel capture-phase          ← avant tout listener page
 *  L5  CSS !important injection        ← cache + patchInsertRule live-lock
 *  L6  DOM walker + MutationObserver debounced 120ms
 *  L7  Visibility/hidden/hasFocus API spoofing
 *  L8  DevTools / debugger bypass
 *  L9  Custom user scripts
 *
 *  SÉCURITÉ postMessage :
 *  Token secret fourni par content.js (monde isolé).
 *  Chaque message authentifié + payload limité à 64 Ko.
 *  Payload validé contre une whitelist stricte de clés.
 *
 *  v2.2.2 :
 *  - selectionchange dans EV (bypass sélection plus complet)
 *  - _ON_SEL mis en cache module-level (clearInlineHandlers O(1))
 *  - touch-action:auto ciblé sur les classes scroll-lock CSS communes
 *  - validatePayload : limite de taille 64 Ko
 *  - patchScroll : scrollTo/scrollBy neutralisés quand S.scroll actif
 *  - patchInsertRule : CSS live-lock chirurgical (sélecteurs globaux seulement)
 *  - SPA URL polling 1 Hz en fallback des hooks history API
 *
 *  v2.2.3 (hardening sécurité) :
 *  - lockPatches() : L1+L2 verrouillés non-writable/non-configurable
 *    dès le bootstrap — impossible à écraser via affectation ou
 *    Object.defineProperty, même depuis une iframe fraîche.
 *  - patchStyleSetProperty() : bloque les inline style !important
 *    adversariaux (user-select:none, cursor:none).
 *  - patchAdoptedStyleSheets() : couvre CSSStyleSheet.replaceSync/replace
 *    (vecteur adoptedStyleSheets) avec réinjection CSS défensive.
 *
 *  v2.2.4 (stabilité + discrétion) :
 *  - BUGFIX CRITIQUE : L4 sentinels passive:false → passive:true — élimine
 *    le jank scroll sur toutes les pages (le browser ne peut pas optimiser le
 *    scroll si un listener non-passif existe, même s'il ne fait rien).
 *  - BUGFIX CRITIQUE : lockPatches retire addEventListener/removeEventListener
 *    du verrou — corrige la casse de zone.js/Angular, Vue et SDKs vidéo.
 *  - lockPatches passe à un accesseur {get,set:noop,configurable:true} :
 *    moins de fingerprint, toujours protection contre réaffectation simple.
 *  - patchStyleSetProperty : comparaisons directes sans regex (chemin chaud).
 *  - console.warn('[Overpass]') supprimé, attribut data-op retiré du DOM.
 *  - Flags _patched évitent de re-patcher à chaque applyAll.
 *  - patchSelection() : removeAllRanges/empty bloqués pendant selectionchange.
 *
 *  v2.2.5 (audit complet) :
 *  - BUGFIX : hideOverlay utilisait el.dataset.uaOvId (attribut data-ua-ov-id
 *    visible en DOM = fingerprint extension détectable). Remplacé par WeakMap.
 *  - BUGFIX : _wmap L2 ignorait le flag capture → même wrapper pour bubble/capture,
 *    removeEventListener pouvait rater. Clé composite (fn + capture) désormais.
 *  - NOUVEAU : patchDesignMode() — document.designMode='on' contournait user-select.
 *  - _sendOverlayList debouncé 50ms — évite N postMessages pour N overlays simultanés.
 *  - validatePayload : vérification rapide keys.length avant JSON.stringify.
 *  - hideOverlay appelle N.setProp directement (bypass notre propre patchStyleSetProperty).
 *
 *  v2.2.6 (zéro trace quand inactif) :
 *  - teardown() : nettoyage complet quand toutes les features sont off
 *    (L4 sentinels retirés, MutationObserver déconnecté, SPA interval nettoyé,
 *    <style> retiré, addEventListener natif restauré, selectionchange retiré,
 *    CSS prototypes restaurés, flags _patched réinitialisés).
 *  - anyActive() : gate sur applyAll et bootstrap — aucun overhead si inactif.
 *  - L4 sentinels différés : créés en mémoire, enregistrés/retirés dynamiquement.
 *  - hookSPANavigation / selectionchange listener : références stockées pour teardown.
 *  - Bootstrap : lockPatches() seul si tout désactivé (L1 transparent, aucune trace).
 *
 *  v2.2.7 (hardening + optimisations + furtivité) :
 *  - BUGFIX : patchConsole ne restaurait jamais console.log sur désactivation.
 *  - BUGFIX : _markUserActive listeners (pointerdown/keydown) jamais retirés
 *    par teardown() → trace permanente même inactive. Maintenant conditionnels.
 *  - BUGFIX : hookSPANavigation re-wrappait history.pushState/replaceState à
 *    chaque réactivation après teardown (double wrapping). Flag _spaHooked.
 *  - BUGFIX : patchVisibility ne restaurait jamais hidden/visibilityState.
 *  - NOUVEAU : patchPrint() — window.matchMedia('print') intercepté pour
 *    empêcher la détection d'impression par les sites paywallés.
 *  - Flags sur patchFocus/patchScroll/patchVisibility/patchConsole —
 *    évite toute ré-assignation inutile à chaque applyAll.
 *  - teardown() complété : focus/scroll/visibility/console/matchMedia restaurés.
 *
 *  v2.2.8 (furtivité critique + bypass + perf) :
 *  - STEALTH : nativeToStr passe à WeakMap + Function.prototype.toString patch unique.
 *    Avant : fn.hasOwnProperty('toString') === true (fingerprint détectable).
 *    Après : false, comme les vraies fonctions natives. Aucune own property visible.
 *  - NOUVEAU : Selection.prototype.toString protégé — certains sites le surchargent
 *    pour retourner '' et vider le texte copié malgré la sélection visible.
 *  - BUGFIX : _debTimer et _ovlDebTimer non nettoyés dans teardown() → callbacks
 *    flush/overlayList pouvaient encore se déclencher après désactivation.
 *  - PERF : _ON_ENTRIES en cache module-level — Object.entries(ON) n'est plus
 *    recréé à chaque appel de clearInlineHandlers.
 *  - CORRECTIF : autoRemoveOverlays utilise N.setProp directement (évite l'auto-
 *    interception par patchStyleSetProperty sur les valeurs 'auto').
 */
(function () {
  'use strict';

  // ── Guard (Symbol non-énumérable, invisible à Object.keys) ──────
  const _GUARD = Symbol();
  if (window[_GUARD]) return;
  try {
    Object.defineProperty(window, _GUARD, {
      value: true, writable: false, enumerable: false, configurable: false,
    });
  } catch (_) { return; }

  // ════════════════════════════════════════════════════════════════
  // REFS NATIVES — capturées avant tout script de la page
  // ════════════════════════════════════════════════════════════════
  const N = {
    AEL     : EventTarget.prototype.addEventListener,
    REL     : EventTarget.prototype.removeEventListener,
    PD      : Event.prototype.preventDefault,
    SP      : Event.prototype.stopPropagation,
    SIP     : Event.prototype.stopImmediatePropagation,
    CC      : console.clear.bind(console),
    focus   : HTMLElement.prototype.focus,
    blur    : HTMLElement.prototype.blur,
    PM      : window.postMessage.bind(window),
    GCD     : Object.getOwnPropertyDescriptor.bind(Object),
    DP      : Object.defineProperty.bind(Object),
    GCS     : window.getComputedStyle.bind(window),
    sT      : window.setTimeout.bind(window),
    sI         : window.setInterval.bind(window),
    scrollTo    : window.scrollTo?.bind(window)   || null,
    scrollBy    : window.scrollBy?.bind(window)   || null,
    insertRule  : CSSStyleSheet.prototype.insertRule,
    replaceSync : CSSStyleSheet.prototype.replaceSync  || null,
    cssReplace  : CSSStyleSheet.prototype.replace      || null,
    setProp     : CSSStyleDeclaration.prototype.setProperty,
    create         : document.createElement.bind(document),
    perfNow        : performance.now.bind(performance),
    removeAllRanges : typeof Selection  !== 'undefined' ? Selection.prototype.removeAllRanges : null,
    selectionEmpty  : typeof Selection  !== 'undefined' ? Selection.prototype.empty           : null,
    selToString     : typeof Selection  !== 'undefined' ? Selection.prototype.toString          : null,
    designModeDesc  : (() => {
      try { return Object.getOwnPropertyDescriptor(Document.prototype,'designMode')
                 || Object.getOwnPropertyDescriptor(document,'designMode') || null; }
      catch(_){ return null; }
    })(),
    // Descripteurs originaux de visibilité pour restauration propre
    visDescs: (() => {
      const d = {}, doc = Document.prototype;
      ['hidden','webkitHidden','visibilityState','webkitVisibilityState'].forEach(p => {
        try { d[p] = Object.getOwnPropertyDescriptor(doc, p)
                   || Object.getOwnPropertyDescriptor(document, p) || null; }
        catch(_) {}
      });
      return d;
    })(),
    matchMedia    : window.matchMedia?.bind(window)        || null,
    print         : window.print?.bind(window)             || null,
    getSelection  : window.getSelection?.bind(window)      || null,
    attachShadow  : Element.prototype.attachShadow         || null,
    DTsetData     : typeof DataTransfer !== 'undefined'
                    ? DataTransfer.prototype.setData : null,
  };

  // Rend une fonction patchée indiscernable du natif.
  //
  // Approche WeakMap (v2.2.8) : au lieu d'ajouter une propriété `toString`
  // en propre sur chaque fn (détectable via fn.hasOwnProperty('toString')),
  // on intercepte Function.prototype.toString une seule fois et on stocke
  // les noms dans un WeakMap invisible.
  //
  // Résultat :
  //   fn.hasOwnProperty('toString')           → false  (identique au natif)
  //   Object.getOwnPropertyDescriptor(fn,'toString') → undefined  ✓
  //   fn.toString()                           → "function name() { [native code] }"  ✓
  const _nativeNames  = new WeakMap();
  const _origFnToStr  = Function.prototype.toString;
  try {
    const _patchedToStr = function toString() {
      const n = _nativeNames.get(this);
      if (n !== undefined) return `function ${n}() { [native code] }`;
      return _origFnToStr.call(this);
    };
    _nativeNames.set(_patchedToStr, 'toString'); // se passe lui-même pour natif
    Object.defineProperty(Function.prototype, 'toString', {
      value: _patchedToStr, writable: true, configurable: true, enumerable: false,
    });
  } catch (_) {}

  function nativeToStr(fn, name) {
    try { Object.defineProperty(fn, 'name', { value: name, configurable: true }); } catch (_) {}
    _nativeNames.set(fn, name); // aucune own property 'toString' sur fn
    return fn;
  }

  // ── Token d'authentification postMessage ─────────────────────────
  // Clés booléennes qui déterminent si l'extension est "active"
  const _ACTIVE_KEYS = [
    'contextmenu','selectstart','clipboard','keyboard','dragdrop','scroll',
    'cursor','pointerEvents','print','overlays','devtools','consoleProtect',
    'focus','visibility',
  ];
  function anyActive() {
    return _ACTIVE_KEYS.some(k => S[k]);
  }

  let _authToken = null;
  let _tokenSet  = false;

  const ALLOWED_KEYS = new Set([
    'contextmenu','selectstart','clipboard','keyboard','dragdrop',
    'scroll','cursor','pointerEvents','print','overlays','devtools',
    'consoleProtect','focus','visibility','customScripts','lang',
  ]);

  // Taille max du payload postMessage : 64 Ko.
  // Protège contre un éventuel envoi massif depuis la page.
  const MAX_PAYLOAD_BYTES = 65536;
  function validatePayload(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
    const keys = Object.keys(p);
    // Vérification rapide du nombre de clés avant le JSON.stringify coûteux
    if (keys.length > ALLOWED_KEYS.size) return false;
    for (const k of keys) if (!ALLOWED_KEYS.has(k)) return false;
    try { if (JSON.stringify(p).length > MAX_PAYLOAD_BYTES) return false; } catch (_) { return false; }
    return true;
  }

  // ── État ──────────────────────────────────────────────────────────
  const S = {
    contextmenu    : true,
    selectstart    : true,
    clipboard      : true,
    keyboard       : true,
    dragdrop       : true,
    scroll         : false,
    cursor         : true,
    pointerEvents  : false,
    print          : true,
    overlays       : false,
    devtools       : false,
    consoleProtect : false,
    focus          : false,
    visibility     : true,
    customScripts  : [],
    lang           : 'fr',
  };

  // NOTE: mousedown retiré de EV (trop agressif — cassait les éditeurs
  // custom, le drag, les composants de sélection). selectstart suffit.
  const EV = {
    contextmenu     : 'contextmenu',
    selectstart     : 'selectstart',
    copy            : 'clipboard',
    cut             : 'clipboard',
    paste           : 'clipboard',
    keydown         : 'keyboard',
    keyup           : 'keyboard',
    keypress        : 'keyboard',
    dragstart       : 'dragdrop',
    drag            : 'dragdrop',
    dragend         : 'dragdrop',
    dragover        : 'dragdrop',
    drop            : 'dragdrop',
    wheel           : 'scroll',
    touchmove       : 'scroll',
    beforeprint     : 'print',
    beforeunload    : 'keyboard', // neutralise les alertes "quitter la page ?"
    pagehide        : 'keyboard', // équivalent SPA de beforeunload
    selectionchange : 'selectstart',
    visibilitychange: 'visibility',
  };

  const ON = {
    oncontextmenu : 'contextmenu',
    onselectstart : 'selectstart',
    oncopy        : 'clipboard',
    oncut         : 'clipboard',
    onpaste       : 'clipboard',
    onkeydown     : 'keyboard',
    onkeyup       : 'keyboard',
    onkeypress    : 'keyboard',
    ondragstart   : 'dragdrop',
    ondrag        : 'dragdrop',
    ondragover       : 'dragdrop',
    ondrop           : 'dragdrop',
    onselectionchange: 'selectstart',
    onbeforeprint    : 'print',
    onbeforeunload   : 'keyboard',
    onblur        : 'focus',
  };

  // Set de tags interactifs partagé par blocked() et clearInlineHandlers
  const _INTERACTIVE_TAGS = new Set(['INPUT','TEXTAREA','SELECT','BUTTON','OPTION','OPTGROUP']);

  function blocked(ev) {
    const k = EV[ev.type];
    if (!k || !S[k]) return false;
    if (k === 'keyboard') {
      if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        const tgt = ev.target;
        if (tgt && tgt !== document && tgt !== document.documentElement && tgt !== document.body) {
          if (_INTERACTIVE_TAGS.has(tgt.tagName) || tgt.isContentEditable) return false;
        }
      }
    }
    return true;
  }

  // ════════════════════════════════════════════════════════════════
  // L1 — Event.prototype override
  // Intercepte preventDefault/stopPropagation au niveau le plus bas.
  // ════════════════════════════════════════════════════════════════
  Event.prototype.preventDefault = nativeToStr(function preventDefault() {
    if (blocked(this)) return;
    return N.PD.call(this);
  }, 'preventDefault');

  Event.prototype.stopPropagation = nativeToStr(function stopPropagation() {
    if (blocked(this)) return;
    return N.SP.call(this);
  }, 'stopPropagation');

  Event.prototype.stopImmediatePropagation = nativeToStr(function stopImmediatePropagation() {
    if (blocked(this)) return;
    return N.SIP.call(this);
  }, 'stopImmediatePropagation');

  // returnValue = false  (chemin "return false" legacy)
  try {
    const rvd = N.GCD(Event.prototype, 'returnValue');
    if (rvd && rvd.set) {
      N.DP(Event.prototype, 'returnValue', {
        get: rvd.get, configurable: true,
        set(v) { if (v === false && blocked(this)) return; rvd.set.call(this, v); },
      });
    }
  } catch (_) {}

  // ════════════════════════════════════════════════════════════════
  // L2 — addEventListener wrapping
  // Deuxième filet : wrapping individuel de chaque listener.
  // ════════════════════════════════════════════════════════════════
  // _wmap : fn → wrapper. Clé composite (fn + capture) pour éviter la
  // collision quand le même fn est enregistré en capture ET en bubbling.
  // WeakMap principal sur fn, Map interne sur la capture flag.
  const _wmap = new WeakMap(); // fn → { bubble: w, capture: w }

  function _getWrapper(fn, capture) {
    let entry = _wmap.get(fn);
    if (!entry) { entry = {}; _wmap.set(fn, entry); }
    const key = capture ? 'capture' : 'bubble';
    if (!entry[key]) {
      const h = typeof fn === 'function' ? fn
              : (fn && typeof fn.handleEvent === 'function') ? fn.handleEvent.bind(fn)
              : fn;
      entry[key] = function (e) {
        if (blocked(e)) {
          const p = e.preventDefault, s = e.stopPropagation, si = e.stopImmediatePropagation;
          e.preventDefault = e.stopPropagation = e.stopImmediatePropagation = function () {};
          try { h.call(this, e); } catch (_) {}
          e.preventDefault = p; e.stopPropagation = s; e.stopImmediatePropagation = si;
        } else {
          h.call(this, e);
        }
      };
    }
    return entry[key];
  }

  EventTarget.prototype.addEventListener = nativeToStr(function addEventListener(type, fn, opts) {
    if (fn && EV[type]) {
      const cap = typeof opts === 'boolean' ? opts : (opts?.capture ?? false);
      return N.AEL.call(this, type, _getWrapper(fn, cap), opts);
    }
    return N.AEL.call(this, type, fn, opts);
  }, 'addEventListener');

  EventTarget.prototype.removeEventListener = nativeToStr(function removeEventListener(type, fn, opts) {
    if (fn && EV[type]) {
      const cap = typeof opts === 'boolean' ? opts : (opts?.capture ?? false);
      const entry = _wmap.get(fn);
      const w = entry?.[cap ? 'capture' : 'bubble'];
      return N.REL.call(this, type, w ?? fn, opts);
    }
    return N.REL.call(this, type, fn, opts);
  }, 'removeEventListener');

  // ════════════════════════════════════════════════════════════════
  // lockPatches — protège L1 contre la réaffectation simple.
  // Utilise un accesseur {get, set:noop, configurable:true} :
  //   • assignment Event.prototype.preventDefault = fn → ignoré silencieusement
  //   • configurable:true → même apparence qu'une prop native (moins détectable)
  //   • addEventListener/removeEventListener intentionnellement exclus :
  //     zone.js (Angular), Vue, SDKs vidéo les re-patchent à l'init.
  //     Les verrouiller cassait ces frameworks même avec tout désactivé.
  // ════════════════════════════════════════════════════════════════
  function lockPatches() {
    const guard = (obj, prop, fn) => {
      try {
        if (Object.getOwnPropertyDescriptor(obj, prop)?.configurable) {
          N.DP(obj, prop, {
            get: () => fn, set: () => {},
            configurable: true, enumerable: true,
          });
        }
      } catch (_) {}
    };
    guard(Event.prototype, 'preventDefault',           Event.prototype.preventDefault);
    guard(Event.prototype, 'stopPropagation',          Event.prototype.stopPropagation);
    guard(Event.prototype, 'stopImmediatePropagation', Event.prototype.stopImmediatePropagation);
    // Note: addEventListener/removeEventListener non verrouillés (compatibilité frameworks)
  }

  // ════════════════════════════════════════════════════════════════
  // L3 — on* property traps via defineProperty
  // Intercepte : document.oncontextmenu = fn; el.onselectstart = fn
  // ════════════════════════════════════════════════════════════════
  const PROTOS = [Document.prototype, HTMLElement.prototype, SVGElement.prototype, Window.prototype];

  function patchOnProp(proto, prop, key) {
    const d = N.GCD(proto, prop);
    if (!d || !d.configurable) return;
    const store = new WeakMap();
    N.DP(proto, prop, {
      enumerable: d.enumerable ?? true,
      configurable: true,
      get() { return S[key] ? null : (store.get(this) ?? null); },
      set(fn) {
        store.set(this, fn);
        if (d.set) d.set.call(this, S[key] ? null : fn);
      },
    });
  }

  Object.entries(ON).forEach(([p, k]) =>
    PROTOS.forEach(pr => { try { patchOnProp(pr, p, k); } catch (_) {} })
  );

  // ════════════════════════════════════════════════════════════════
  // L4 — Capture-phase sentinels (enregistrement différé)
  // passive:true obligatoire — voir explication v2.2.4.
  // Les sentinels sont pré-créés ici mais enregistrés / retirés
  // dynamiquement selon anyActive() pour laisser zéro trace quand
  // l'extension est entièrement désactivée.
  // ════════════════════════════════════════════════════════════════
  const _sentinelFns = new Map(); // type → fn (pré-créées, pas encore enregistrées)
  let   _sentinelsOn = false;

  Object.keys(EV).forEach(type => {
    _sentinelFns.set(type, e => {
      if (!blocked(e)) return;
      try { N.DP(e, 'defaultPrevented', { get: () => false, configurable: true }); }
      catch (_) {}
    });
  });
  // beforeunload : neutralise e.returnValue en plus de defaultPrevented
  // (c'est returnValue qui déclenche le dialog natif, pas preventDefault)
  _sentinelFns.set('beforeunload', e => {
    if (!blocked(e)) return;
    try { N.DP(e, 'defaultPrevented', { get: () => false, configurable: true }); } catch (_) {}
    try { N.DP(e, 'returnValue', { get: () => '', set: () => {}, configurable: true }); } catch (_) {}
  });

  function _addSentinels() {
    if (_sentinelsOn) return;
    _sentinelFns.forEach((fn, type) =>
      N.AEL.call(document, type, fn, { capture: true, passive: true }));
    _sentinelsOn = true;
  }

  function _removeSentinels() {
    if (!_sentinelsOn) return;
    _sentinelFns.forEach((fn, type) =>
      N.REL.call(document, type, fn, { capture: true }));
    _sentinelsOn = false;
  }

  // ════════════════════════════════════════════════════════════════
  // L5 — CSS injection
  // ════════════════════════════════════════════════════════════════
  let _css      = null;
  let _cssCache = ''; // cache : évite de toucher le DOM si le CSS n'a pas changé

  function buildCSS() {
    const r = [];
    if (S.selectstart) {
      r.push(
        `*,*::before,*::after{user-select:text!important;-webkit-user-select:text!important;-moz-user-select:text!important}`,
        `[class*="no-select"],[class*="noselect"],[class*="disable-select"],[unselectable="on"]{user-select:text!important;-webkit-user-select:text!important}`,
        `::selection{background:rgba(59,130,246,.3)!important;color:inherit!important}`
      );
    }
    if (S.cursor) {
      r.push(
        `*{cursor:auto!important;-webkit-touch-callout:default!important}`,
        `a,button,[role="button"],[onclick],[tabindex="0"]{cursor:pointer!important}`,
        `input[type="text"],input[type="search"],input[type="email"],input[type="password"],` +
        `input[type="url"],input[type="number"],textarea,[contenteditable="true"],[contenteditable=""]{cursor:text!important}`,
        `input[type="range"]{cursor:ew-resize!important}`
      );
    }
    if (S.scroll) {
      r.push(
        `html,body{overflow:auto!important;height:auto!important;touch-action:auto!important;max-height:none!important}`,
        // Classes courantes de scroll-lock + attribut touch-action direct
        `[class*="modal-open"],[class*="no-scroll"],[class*="noscroll"],[class*="scroll-lock"],` +
        `[class*="touch-none"],[class*="no-touch"],[touch-action="none"]` +
        `{overflow:auto!important;touch-action:auto!important}`
      );
    }
    if (S.dragdrop) {
      r.push(
        `*{-webkit-user-drag:auto!important}`,
        `img,a{-webkit-user-drag:auto!important}`,
        `[draggable="false"]{cursor:grab!important}`
      );
    }
    if (S.print) {
      r.push(
        `@media print{html,body,*{display:revert!important;visibility:visible!important;overflow:visible!important;height:auto!important}}`
      );
    }
    if (S.pointerEvents) {
      r.push(
        `[class*="overlay"]:not(video):not(iframe):not(canvas),` +
        `[class*="paywall"],[id*="overlay"],[id*="paywall"],` +
        `[class*="cookie-"],[id*="cookie-"],[class*="gdpr"],[id*="gdpr"]` +
        `{pointer-events:none!important;opacity:0!important}`
      );
    }
    return r.join('\n');
  }

  function applyCSS() {
    const css = buildCSS();
    if (css === _cssCache && _css?.isConnected) return; // rien de nouveau, on évite le reflow
    _cssCache = css;
    if (!_css) {
      // Pas d'attribut identifiable : on garde seulement la référence JS.
      // Un attribut visible (data-op, data-ext…) serait un fingerprint DOM.
      _css = N.create('style');
    }
    _css.textContent = css;
    const root = document.head || document.documentElement;
    if (root && !_css.isConnected) root.appendChild(_css);
  }

  // ════════════════════════════════════════════════════════════════
  // L6 — DOM walker + MutationObserver DEBOUNCED 120ms
  //
  // Optimisation CPU : mutations bufferisées 120ms, traitement
  // ciblé nœud par nœud (pas de querySelectorAll global à chaque
  // mutation — essentiel sur les SPA avec scroll infini).
  // ════════════════════════════════════════════════════════════════
  let _debTimer   = null;
  let _dirtyNodes = new Set();
  let _globalDirt = false;
  let _needOvl    = false;

  // requestIdleCallback : disponible depuis Chrome 47.
  // Fallback setTimeout(fn, 100) pour les rares cas où il n'est pas dispo.
  const _idle = typeof requestIdleCallback === 'function'
    ? cb => requestIdleCallback(cb, { timeout: 500 })
    : cb => N.sT(cb, 100);

  function _flush() {
    if (_globalDirt) { clearInlineHandlers(); if (S.dragdrop) fixDraggable(); }
    _dirtyNodes.forEach(n => {
      if (n.isConnected) {
        clearInlineHandlers(n);
        if (S.dragdrop) fixDraggable(n);
      }
    });
    // autoRemoveOverlays appelle getBoundingClientRect sur chaque élément →
    // force un layout. On le diffère pendant le temps mort du navigateur.
    if (_needOvl && S.overlays) _idle(autoRemoveOverlays);
    _dirtyNodes.clear();
    _globalDirt = false;
    _needOvl    = false;
  }

  function scheduleFlush() {
    clearTimeout(_debTimer);
    _debTimer = N.sT(_flush, 120);
  }

  function fixDraggable(root) {
    if (!S.dragdrop) return;
    try {
      // querySelectorAll est ~10-50x plus rapide qu'une récursion manuelle sur le DOM,
      // et ne risque pas de dépasser la call stack sur des arbres profonds (SPA).
      const scope = root || document;
      if (!scope.querySelectorAll) return;
      scope.querySelectorAll('[draggable="false"]').forEach(el => {
        const tag = el.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          el.setAttribute('draggable', 'true');
        }
      });
      scope.querySelectorAll('[ondragstart]').forEach(el => {
        const tag = el.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          el.removeAttribute('ondragstart');
          try { el.ondragstart = null; } catch (_) {}
        }
      });
    } catch (_) {}
  }

  // Éléments interactifs dont on ne retire jamais les handlers inline :
  // supprimer onkeydown d'un <input> de validation, d'un <select> ou d'un
  // <button> casserait les formulaires, les composants custom et les éditeurs.
  // Sélecteur CSS et entrées mis en cache — ON ne mute jamais après initialisation.
  const _ON_SEL     = Object.keys(ON).map(p => `[${p}]`).join(',');
  const _ON_ENTRIES = Object.entries(ON); // évite Object.entries() sur chaque nœud

  function clearInlineHandlers(root) {
    const nodes = root
      ? [root]
      : [document, document.documentElement, document.body, window];
    nodes.filter(Boolean).forEach(node => {
      _ON_ENTRIES.forEach(([prop, key]) => {
        if (!S[key]) return;
        try {
          if (node[prop] != null) node[prop] = null;
          if (node.removeAttribute) node.removeAttribute(prop);
        } catch (_) {}
      });
    });
    const scope = root || document;
    if (scope && scope.querySelectorAll) {
      try {
        scope.querySelectorAll(_ON_SEL).forEach(el => {
          // Ne pas toucher aux éléments interactifs ni aux éléments contenteditable
          if (INTERACTIVE_TAGS.has(el.tagName) || el.isContentEditable) return;
          _ON_ENTRIES.forEach(([prop, key]) => {
            if (S[key] && el.hasAttribute(prop)) {
              el.removeAttribute(prop);
              try { el[prop] = null; } catch (_) {}
            }
          });
        });
      } catch (_) {}
    }
  }

  let _obs = null;
  function startObserver() {
    if (_obs) return;
    _obs = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes') {
          // attributeFilter garantit qu'on ne reçoit que les attrs pertinents
          // (les attrs on* et draggable). Plus besoin de re-vérifier ici.
          _globalDirt = true;
        }
        if (m.type === 'childList') {
          m.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            _dirtyNodes.add(n);
            _needOvl = true;
          });
        }
      }
      scheduleFlush();
    });
    const root = document.documentElement || document.body;
    if (root) _obs.observe(root, {
      childList        : true,
      subtree          : true,
      attributes       : true,
      // Observe UNIQUEMENT les attributs on* et draggable, pas style/aria/data-*
      // Réduit drastiquement les callbacks sur les SPA (YouTube, React, etc.)
      attributeFilter  : [...Object.keys(ON), 'draggable'],
    });
  }

  // ════════════════════════════════════════════════════════════════
  // L7 — Visibility spoofing
  // ════════════════════════════════════════════════════════════════
  function patchVisibility() {
    if (S.visibility) {
      if (_visPatched) return;
      _visPatched = true;
      ['hidden', 'webkitHidden'].forEach(p => {
        try { N.DP(document, p, { get: () => false, configurable: true, enumerable: true }); } catch (_) {}
      });
      ['visibilityState', 'webkitVisibilityState'].forEach(p => {
        try { N.DP(document, p, { get: () => 'visible', configurable: true, enumerable: true }); } catch (_) {}
      });
      try {
        N.DP(document, 'hasFocus', {
          value: nativeToStr(function hasFocus() { return true; }, 'hasFocus'),
          configurable: true, writable: true,
        });
      } catch (_) {}
    } else {
      if (!_visPatched) return;
      _visPatched = false;
      // Restaurer les descripteurs originaux
      ['hidden','webkitHidden','visibilityState','webkitVisibilityState'].forEach(p => {
        const d = N.visDescs?.[p];
        if (d) { try { N.DP(document, p, d); } catch (_) {} }
      });
      // hasFocus : restaurer depuis Document.prototype
      try {
        const d = N.GCD(Document.prototype, 'hasFocus');
        if (d) N.DP(document, 'hasFocus', d);
      } catch (_) {}
    }
  }

  // ════════════════════════════════════════════════════════════════
  // L8 — DevTools / debugger bypass
  //
  // Vecteurs couverts (sans rien casser de légitime) :
  //  V1  Function()/eval() : neutralise "debugger"
  //  V2  outerWidth/outerHeight : spoofe la taille de panel
  //  V3  alert() : bloque les alertes de détection
  //  V4  performance.now() : jitter anti-timing
  //  V5  setInterval/setTimeout sub-50ms : throttle
  //  V6  Error.stack : masque les chemins d'extension
  //  V7  Proxy console.id : neutralise le getter DevTools
  // ════════════════════════════════════════════════════════════════
  let _devDone = false;
  function patchDevtools() {
    if (!S.devtools || _devDone) return;
    _devDone = true;

    // V1 — Neutralise debugger via Function() / eval()
    // NOTE: "function eval" et "function Function" sont interdits en strict
    // mode → on utilise des variables intermédiaires sans ces noms réservés.
    try {
      const _Fn = window.Function;
      const sanitize = s => typeof s === 'string' ? s.replace(/\bdebugger\b/g, '(void 0)') : s;
      const _FnWrap = nativeToStr(function (...args) {
        return _Fn.apply(this, args.map(sanitize));
      }, 'Function');
      _FnWrap.prototype = _Fn.prototype;
      window.Function = _FnWrap;

      const _ev = window.eval;
      const _evalWrap = function (code) {
        return _ev.call(this, typeof code === 'string' ? sanitize(code) : code);
      };
      nativeToStr(_evalWrap, 'eval');
      window.eval = _evalWrap;
    } catch (_) {}

    // V2 — outerWidth/Height spoof
    try {
      N.DP(window, 'outerWidth',  { get: () => window.innerWidth,      configurable: true });
      N.DP(window, 'outerHeight', { get: () => window.innerHeight + 1,  configurable: true });
    } catch (_) {}

    // V3 — Bloquer les alertes de détection
    try {
      const _al = window.alert;
      window.alert = nativeToStr(function alert(msg) {
        if (typeof msg === 'string' && /devtools|inspect|console/i.test(msg)) return;
        return _al.call(this, msg);
      }, 'alert');
    } catch (_) {}

    // V4 — performance.now() jitter anti-timing
    try {
      const _pn = N.perfNow;
      performance.now = nativeToStr(function now() {
        return _pn() - ((_pn() * 0.001) % 0.05);
      }, 'now');
    } catch (_) {}

    // V5 — setInterval/setTimeout : bloquer uniquement les callbacks string
    // contenant "debugger". On NE throttle plus les callbacks function car cela
    // casse les animations et timers légitimes à haute fréquence.
    try {
      window.setInterval = nativeToStr(function setInterval(fn, ms, ...a) {
        if (typeof fn === 'string' && /debugger|devtools/i.test(fn)) return 0;
        if (typeof fn === 'string') return N.sI(fn, Math.max(Number(ms) || 0, 50), ...a);
        return N.sI(fn, ms, ...a);
      }, 'setInterval');
      window.setTimeout = nativeToStr(function setTimeout(fn, ms, ...a) {
        if (typeof fn === 'string' && /debugger|devtools/i.test(fn)) return 0;
        return N.sT(fn, ms, ...a);
      }, 'setTimeout');
    } catch (_) {}

    // V6 — Error.stack : masquer les chemins chrome-extension://
    try {
      const _ES = Error.prepareStackTrace;
      Error.prepareStackTrace = function (err, stack) {
        const clean = stack.filter(f => !(f.getFileName?.() || '').includes('chrome-extension://'));
        if (_ES) return _ES(err, clean);
        return clean.map(f => `    at ${f.toString()}`).join('\n');
      };
    } catch (_) {}

    // V7 — Proxy : neutralise la détection via console.id getter
    try {
      const _P = window.Proxy;
      window.Proxy = new _P(_P, {
        construct(target, args) {
          const [obj, handler] = args;
          if (handler && typeof handler.get === 'function') {
            const orig = handler.get.bind(handler);
            handler.get = function (o, prop, recv) {
              if (prop === 'id' && o === console) return 1;
              return orig(o, prop, recv);
            };
          }
          return new target(obj, handler);
        },
      });
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════════
  // Console protection
  // ════════════════════════════════════════════════════════════════
  function patchConsole() {
    if (S.consoleProtect) {
      if (_consolePatched) return;
      _consolePatched = true;
      console.clear = nativeToStr(function clear() {}, 'clear');
      try {
        _origConsoleLog = console.log.bind(console);
        console.log = nativeToStr(function log(...args) {
          return _origConsoleLog(...args.map(a => {
            if (a && typeof a === 'object') {
              try { if (/devtools/i.test(String(a))) return '[object Object]'; } catch (_) {}
            }
            return a;
          }));
        }, 'log');
      } catch (_) {}
    } else {
      if (!_consolePatched) return;
      _consolePatched = false;
      console.clear = N.CC;
      // Restaurer console.log (bug: n'était jamais restauré avant v2.2.7)
      if (_origConsoleLog) {
        try { console.log = nativeToStr(_origConsoleLog, 'log'); } catch (_) {}
        _origConsoleLog = null;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SPA Navigation hook
  // Re-applique les protections après pushState/replaceState/popstate.
  // ════════════════════════════════════════════════════════════════
  function hookSPANavigation() {
    if (!_spaHooked) {
      _spaHooked = true;
      // Patcher les history APIs UNE SEULE FOIS.
      // _spaHooked empêche le double-wrapping si hookSPANavigation() est rappelé
      // après un teardown+réactivation (le patch survit au teardown).
      try {
        const _push = history.pushState.bind(history);
        history.pushState = nativeToStr(function pushState(...args) {
          const r = _push(...args); _spaRewrap(); return r;
        }, 'pushState');
      } catch (_) {}
      try {
        const _rep = history.replaceState.bind(history);
        history.replaceState = nativeToStr(function replaceState(...args) {
          const r = _rep(...args); _spaRewrap(); return r;
        }, 'replaceState');
      } catch (_) {}
      N.AEL.call(window, 'popstate',   _spaRewrap);
      N.AEL.call(window, 'hashchange', _spaRewrap);
    }
    // Redémarrer le polling (peut être relancé après teardown)
    if (_spaInterval) clearInterval(_spaInterval);
    _lastHref = location.href;
    _spaInterval = N.sI(() => {
      if (location.href !== _lastHref) { _lastHref = location.href; _spaRewrap(); }
    }, 1000);
  }

  // ════════════════════════════════════════════════════════════════
  // Focus protection
  // Suivi d'interaction utilisateur : window.event est déprécié.
  // On observe les événements pointer et clavier avec une fenêtre
  // de 600ms pour distinguer focus programmatique de focus utilisateur.
  // ════════════════════════════════════════════════════════════════
  let _userInteracting = false;
  let _uiTimer = null;
  function _markUserActive() {
    _userInteracting = true;
    clearTimeout(_uiTimer);
    _uiTimer = N.sT(() => { _userInteracting = false; }, 600);
  }
  // _markUserActive listeners : enregistrés/retirés dynamiquement par patchFocus()
  // (jamais actifs si S.focus n'a jamais été true → zéro trace par défaut)
  let _markListenersAdded = false;

  function patchFocus() {
    if (S.focus) {
      // Enregistrer les listeners _markUserActive seulement quand nécessaire
      if (!_markListenersAdded) {
        N.AEL.call(document, 'pointerdown', _markUserActive, { capture: true, passive: true });
        N.AEL.call(document, 'keydown',     _markUserActive, { capture: true, passive: true });
        _markListenersAdded = true;
      }
      if (_focusPatched) return; // déjà actif
      _focusPatched = true;
      HTMLElement.prototype.focus = nativeToStr(function focus(o) {
        if (_userInteracting) return N.focus.call(this, o);
      }, 'focus');
      HTMLElement.prototype.blur = nativeToStr(function blur() {
        if (_userInteracting) return N.blur.call(this);
      }, 'blur');
    } else {
      if (_markListenersAdded) {
        N.REL.call(document, 'pointerdown', _markUserActive, { capture: true });
        N.REL.call(document, 'keydown',     _markUserActive, { capture: true });
        _markListenersAdded = false;
      }
      if (!_focusPatched) return; // déjà restauré
      _focusPatched = false;
      HTMLElement.prototype.focus = N.focus;
      HTMLElement.prototype.blur  = N.blur;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // OVERLAY MANAGER
  // ════════════════════════════════════════════════════════════════
  const _overlays = new Map();
  const _ovEls   = new WeakMap(); // el → overlayId — remplace el.dataset.uaOvId
  let _ovCnt = 0;
  let _ovlDebTimer = null;

  // Debounce _sendOverlayList : évite N postMessages si N overlays sont cachés
  // d'un coup (ex: autoRemoveOverlays sur une page avec plusieurs éléments).
  function _scheduleOverlayList() {
    clearTimeout(_ovlDebTimer);
    _ovlDebTimer = N.sT(_sendOverlayList, 50);
  }

  function _elDesc(el) {
    const id  = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const txt = (el.innerText || '').trim().slice(0, 24).replace(/\s+/g, ' ');
    return `<${el.tagName.toLowerCase()}${id || cls}>${txt ? ` "${txt}"` : ''}`;
  }

  function hideOverlay(el, auto = false) {
    if (!el || _ovEls.has(el)) return; // déjà masqué — plus de fingerprint DOM
    const id = `ov_${++_ovCnt}`;
    _overlays.set(id, {
      el, origDisplay: el.style.display, origVis: el.style.visibility,
      origOp: el.style.opacity, desc: _elDesc(el), auto, ts: Date.now(),
    });
    _ovEls.set(el, id); // WeakMap : invisible, GC-friendly
    N.setProp.call(el.style, 'display', 'none', 'important');
    _scheduleOverlayList();
  }

  function restoreOverlay(id) {
    const e = _overlays.get(id);
    if (!e) return;
    e.el.style.display    = e.origDisplay;
    e.el.style.visibility = e.origVis;
    e.el.style.opacity    = e.origOp;
    _ovEls.delete(e.el);   // nettoyer le WeakMap
    _overlays.delete(id);
    _scheduleOverlayList();
  }

  function _sendOverlayList() {
    const list = [..._overlays.entries()].map(([id, { desc, auto, ts }]) => ({ id, desc, auto, ts }));
    N.PM({ __ch: BUS_OUT, action: 'overlayList', payload: list }, '*');
  }

  function autoRemoveOverlays() {
    if (!S.overlays) return;
    try {
      document.querySelectorAll('div,section,aside,article,header').forEach(el => {
        if (_ovEls.has(el)) return; // déjà masqué
        const cs = N.GCS(el);
        const zi = parseInt(cs.zIndex) || 0;
        if ((cs.position === 'fixed' || cs.position === 'absolute') && zi > 100) {
          const r = el.getBoundingClientRect();
          if (r.width  > window.innerWidth  * 0.75 &&
              r.height > window.innerHeight * 0.45 &&
              // Ne jamais supprimer un overlay contenant des éléments interactifs :
              // modales de login, formulaires de consentement, dialogues natifs, etc.
              !el.querySelector('nav,video,iframe,canvas,form,input,textarea,select,button[type="submit"]')) {
            hideOverlay(el, true);
          }
        }
      });
      ['overflow','overflow-y','height','max-height'].forEach(p => {
        // N.setProp direct : évite de passer par notre propre patchStyleSetProperty
        if (document.body) N.setProp.call(document.body.style, p, 'auto', 'important');
        if (document.documentElement) N.setProp.call(document.documentElement.style, p, 'auto', 'important');
      });
      ['modal-open','overflow-hidden','no-scroll','noscroll','scroll-lock','locked']
        .forEach(c => document.body?.classList.remove(c));
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════════
  // OVERLAY PICKER
  // ════════════════════════════════════════════════════════════════
  let _picker = false, _pickerTarget = null, _pickerHL = null, _pickerHint = null;

  const PICKER_HINTS = {
    fr: '🎯 Cliquez sur un élément pour le masquer — Échap pour annuler',
    en: '🎯 Click an element to hide it — Escape to cancel',
    es: '🎯 Haz clic en un elemento para ocultarlo — Escape para cancelar',
    de: '🎯 Klicke auf ein Element um es auszublenden — Esc zum Abbrechen',
  };

  function activatePicker() {
    if (_picker) return;
    _picker = true;
    _pickerHL = N.create('div');
    Object.assign(_pickerHL.style, {
      position:'fixed', pointerEvents:'none', zIndex:'2147483646',
      border:'2px solid #22c55e', background:'rgba(34,197,94,.09)',
      borderRadius:'4px', display:'none', boxShadow:'0 0 0 3px rgba(34,197,94,.12)',
    });
    _pickerHint = N.create('div');
    Object.assign(_pickerHint.style, {
      position:'fixed', bottom:'16px', left:'50%', transform:'translateX(-50%)',
      zIndex:'2147483647', background:'#0d0d14', color:'#f1f5f9',
      fontFamily:'system-ui,sans-serif', fontSize:'13px', fontWeight:'500',
      padding:'8px 18px', borderRadius:'20px', border:'1px solid #22c55e88',
      pointerEvents:'none', whiteSpace:'nowrap', boxShadow:'0 4px 24px rgba(0,0,0,.6)',
    });
    _pickerHint.textContent = PICKER_HINTS[S.lang] || PICKER_HINTS.fr;
    document.body?.appendChild(_pickerHL);
    document.body?.appendChild(_pickerHint);
    document.body.style.cursor = 'crosshair';
    N.AEL.call(document, 'mousemove', _mvPicker, { capture: true, passive: true });
    N.AEL.call(document, 'click',     _clPicker, { capture: true });
    N.AEL.call(document, 'keydown',   _kyPicker, { capture: true });
  }

  function deactivatePicker(done = false) {
    _picker = false; _pickerTarget = null;
    if (document.body) document.body.style.cursor = '';
    _pickerHL?.remove();   _pickerHL   = null;
    _pickerHint?.remove(); _pickerHint = null;
    N.REL.call(document, 'mousemove', _mvPicker, true);
    N.REL.call(document, 'click',     _clPicker, true);
    N.REL.call(document, 'keydown',   _kyPicker, true);
    N.PM({ __ch: BUS_OUT, action: done ? 'pickerDone' : 'pickerCancelled' }, '*');
  }

  function _mvPicker(e) {
    if (!_picker || !_pickerHL) return;
    _pickerHL.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    _pickerHL.style.display = 'block';
    if (!el || el === _pickerHL || el === _pickerHint) return;
    _pickerTarget = el;
    const r = el.getBoundingClientRect();
    Object.assign(_pickerHL.style, {
      left: r.left+'px', top: r.top+'px',
      width: r.width+'px', height: r.height+'px',
    });
  }
  function _clPicker(e) {
    N.PD.call(e); N.SP.call(e); N.SIP.call(e);
    if (_pickerTarget) hideOverlay(_pickerTarget, false);
    deactivatePicker(true);
  }
  function _kyPicker(e) { if (e.key === 'Escape') deactivatePicker(false); }

  // ════════════════════════════════════════════════════════════════
  // Custom scripts (L9)
  // ════════════════════════════════════════════════════════════════
  const _ran = new Set();
  function runScripts(phase) {
    if (!Array.isArray(S.customScripts)) return;
    S.customScripts.forEach(sc => {
      if (!sc.enabled || sc.runAt !== phase) return;
      const uid = `${sc.id}_${phase}`;
      if (_ran.has(uid)) return;
      _ran.add(uid);
      try {
        // eslint-disable-next-line no-new-func
        (new Function(sc.code))();
      } catch (_) {
        // Échec silencieux : un console.warn avec le nom de l'extension
        // serait un fingerprint identifiable par n'importe quel site.
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // patchScroll — scrollTo/scrollBy neutralisés quand S.scroll est actif.
  // Les sites de presse utilisent window.scrollTo(0,0) en boucle pour
  // empêcher l'utilisateur de descendre dans la page.
  // ════════════════════════════════════════════════════════════════
  function patchScroll() {
    if (S.scroll && N.scrollTo) {
      if (_scrollPatched) return;
      _scrollPatched = true;
      window.scrollTo = nativeToStr(function scrollTo() {}, 'scrollTo');
      window.scrollBy = nativeToStr(function scrollBy() {}, 'scrollBy');
    } else {
      if (!_scrollPatched) return;
      _scrollPatched = false;
      if (N.scrollTo) window.scrollTo = N.scrollTo;
      if (N.scrollBy) window.scrollBy = N.scrollBy;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // patchInsertRule — CSS live-lock chirurgical.
  // Intercepte uniquement les règles globales (*|body|html) qui
  // réintroduisent user-select:none ou cursor:none après l'injection
  // CSS de L5. Toutes les autres règles passent sans modification.
  // ════════════════════════════════════════════════════════════════
  let _insertRuleActive = false;
  function patchInsertRule() {
    const needed = S.selectstart || S.cursor;
    if (needed === _insertRuleActive) return; // rien à changer
    _insertRuleActive = needed;
    if (!needed) {
      CSSStyleSheet.prototype.insertRule = N.insertRule;
      return;
    }
    CSSStyleSheet.prototype.insertRule = nativeToStr(function insertRule(rule, idx) {
      const low = rule.toLowerCase();
      // Sélecteur global seulement — on ne touche pas aux règles de composants
      if (/^\s*(\*|body|html)\s*[{,]/.test(rule)) {
        if (S.selectstart && /user-select\s*:\s*none/.test(low)) return idx ?? 0;
        if (S.cursor      && /cursor\s*:\s*none/.test(low))       return idx ?? 0;
      }
      return N.insertRule.call(this, rule, idx ?? this.cssRules?.length ?? 0);
    }, 'insertRule');
  }

  // ════════════════════════════════════════════════════════════════
  // patchStyleSetProperty — bloque les inline style !important.
  //
  // Vecteur : element.style.setProperty('user-select','none','important')
  // Un inline style avec priority='important' bat n'importe quel
  // !important dans une stylesheet (cascade CSS inline > stylesheet).
  // On intercepte uniquement les propriétés connues avec val='none'.
  // ════════════════════════════════════════════════════════════════
  let _setPropActive = false;
  function patchStyleSetProperty() {
    const needed = S.selectstart || S.cursor;
    if (needed === _setPropActive) return;
    _setPropActive = needed;
    if (!needed) {
      CSSStyleDeclaration.prototype.setProperty = N.setProp;
      return;
    }
    CSSStyleDeclaration.prototype.setProperty = nativeToStr(function setProperty(prop, val, priority) {
      // Comparaisons directes sans regex : setProperty est un chemin ultra-chaud
      // sur les pages à animations (vidéo, jeux, dashboards).
      // Les noms de propriétés CSS sont toujours en minuscules dans setProperty.
      if (val === 'none' || val === 'none !important') {
        if (S.selectstart &&
            (prop === 'user-select' || prop === '-webkit-user-select' || prop === '-moz-user-select'))
          return;
        if (S.cursor && prop === 'cursor')
          return;
      }
      return N.setProp.call(this, prop, val, priority);
    }, 'setProperty');
  }

  // ════════════════════════════════════════════════════════════════
  // patchAdoptedStyleSheets — couvre le vecteur adoptedStyleSheets.
  //
  // document.adoptedStyleSheets = [sheet] permet aux sites d'injecter
  // du CSS via CSSStyleSheet.replaceSync/replace, en contournant
  // insertRule. Notre CSS !important dans <style> l'emporte déjà dans
  // la cascade (les @important des stylesheets antérieurs gagnent), mais
  // on ajoute une réinjection défensive sur le prochain tick si des
  // règles globales restrictives sont détectées.
  // ════════════════════════════════════════════════════════════════
  const _RESTRICT_RE = /(html|body|\*)[^{]*\{[^}]*(user-select\s*:\s*none|cursor\s*:\s*none)/i;

  let _adoptedActive = false;
  function patchAdoptedStyleSheets() {
    const needed = S.selectstart || S.cursor;
    if (needed === _adoptedActive) return;
    _adoptedActive = needed;
    if (!needed) {
      if (N.replaceSync) CSSStyleSheet.prototype.replaceSync = N.replaceSync;
      if (N.cssReplace)  CSSStyleSheet.prototype.replace     = N.cssReplace;
      return;
    }

    function onRestrictiveCSS() {
      // Invalide le cache CSS et réinjecte au prochain tick.
      // Notre <style> !important écrase le adoptedStyleSheet hostile.
      _cssCache = '';
      N.sT(applyCSS, 0);
    }

    if (N.replaceSync) {
      CSSStyleSheet.prototype.replaceSync = nativeToStr(function replaceSync(css) {
        N.replaceSync.call(this, css);
        if (typeof css === 'string' && _RESTRICT_RE.test(css)) onRestrictiveCSS();
      }, 'replaceSync');
    }

    if (N.cssReplace) {
      CSSStyleSheet.prototype.replace = nativeToStr(function replace(css) {
        const p = N.cssReplace.call(this, css);
        if (typeof css === 'string' && _RESTRICT_RE.test(css))
          p.then(onRestrictiveCSS).catch(() => {});
        return p;
      }, 'replace');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // patchSelection — bloque window.getSelection().removeAllRanges()
  //
  // Vecteur résiduel : les handlers selectionchange des sites appellent
  // removeAllRanges() directement sur l'objet Selection pour effacer
  // la sélection de l'utilisateur. L1/L2/L4 bloquent le handler mais
  // pas la méthode removeAllRanges elle-même.
  //
  // Approche : flag _blockClear actif SEULEMENT pendant la fenêtre
  // synchrone d'un event selectionchange (sentinel capture-phase → sT(0)
  // pour lever le flag après tous les handlers sync). Les appels légitimes
  // (clic vide, focus, éditeurs rich-text hors selectionchange) passent.
  // ════════════════════════════════════════════════════════════════
  let _blockClear         = false;
  let _selPatched         = false;
  let _focusPatched       = false; // flag patchFocus  — évite re-assign à chaque applyAll
  let _scrollPatched      = false; // flag patchScroll
  let _visPatched         = false; // flag patchVisibility
  let _consolePatched     = false; // flag patchConsole
  let _matchMediaPatched  = false; // flag patchPrint (matchMedia)
  let _spaHooked          = false; // flag hookSPA — empêche le double-wrapping des history APIs
  let _spaInterval        = null;  // ID du setInterval SPA polling (module-level pour teardown)
  let _lastHref           = '';    // suivi URL pour le polling SPA
  let _selChangeLn        = null;  // référence au listener selectionchange (pour teardown)
  let _origConsoleLog     = null;  // référence au console.log original (pour restauration)

  // SPA rewrap hoissté au niveau module pour être partagé entre hookSPANavigation
  // et l'intervalle de polling (évite de créer une nouvelle closure à chaque call).
  function _spaRewrap() {
    N.sT(() => { clearInlineHandlers(); if (S.dragdrop) fixDraggable(); applyCSS(); }, 100);
  }

  // Sentinel selectionchange : active la fenêtre de blocage
  // Stocké dans _selChangeLn pour pouvoir le retirer lors du teardown.
  if (typeof Selection !== 'undefined') {
    _selChangeLn = () => {
      if (!S.selectstart) return;
      _blockClear = true;
      N.sT(() => { _blockClear = false; }, 0);
    };
    N.AEL.call(document, 'selectionchange', _selChangeLn, { capture: true, passive: true });
  }

  function patchSelection() {
    if (!N.removeAllRanges || typeof Selection === 'undefined') return;
    const needed = S.selectstart;
    if (needed === _selPatched) return;
    _selPatched = needed;
    if (needed) {
      Selection.prototype.removeAllRanges = nativeToStr(function removeAllRanges() {
        if (_blockClear) return;
        return N.removeAllRanges.call(this);
      }, 'removeAllRanges');
      if (N.selectionEmpty) {
        Selection.prototype.empty = nativeToStr(function empty() {
          if (_blockClear) return;
          return N.selectionEmpty.call(this);
        }, 'empty');
      }
      // Protéger Selection.toString : certains sites le surchargent pour retourner
      // '' et vider le texte copié même quand la sélection est visuellement présente.
      if (N.selToString) {
        Selection.prototype.toString = nativeToStr(function toString() {
          return N.selToString.call(this);
        }, 'toString');
      }
    } else {
      Selection.prototype.removeAllRanges = N.removeAllRanges;
      if (N.selectionEmpty) Selection.prototype.empty = N.selectionEmpty;
      if (N.selToString)    Selection.prototype.toString = N.selToString;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // patchDesignMode — bloque document.designMode = 'on'.
  //
  // document.designMode='on' met le document en mode édition, ce qui
  // supprime user-select sur tout le document et contourne L5/L1/L2.
  // On le neutralise en no-op quand selectstart est actif.
  // ════════════════════════════════════════════════════════════════
  let _designModePatched = false;
  let _shadowPatched     = false;
  let _clipboardPatched  = false;
  let _getSelPatched     = false;
  let _clipboardCopyLn   = null;
  const _shadowStyles    = new WeakMap();
  const _shadowRoots     = new Set();
  function patchDesignMode() {
    const needed = S.selectstart;
    if (needed === _designModePatched) return;
    _designModePatched = needed;
    if (needed) {
      try {
        N.DP(document, 'designMode', {
          get: () => 'off', set: () => {},
          configurable: true, enumerable: true,
        });
      } catch (_) {}
    } else if (N.designModeDesc) {
      try { N.DP(document, 'designMode', N.designModeDesc); } catch (_) {
        try { delete document.designMode; } catch (_) {}
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // patchPrint — intercepte window.matchMedia('print').
  //
  // Nouveau vecteur : certains sites écoutent window.matchMedia('print')
  // pour détecter une tentative d'impression et afficher un paywall.
  // On intercepte matchMedia et on force matches=false pour les queries
  // contenant 'print', empêchant la détection.
  // ════════════════════════════════════════════════════════════════
  function patchPrint() {
    if (!N.matchMedia && !N.print) return;
    if (S.print) {
      if (_matchMediaPatched) return;
      _matchMediaPatched = true;
      if (N.matchMedia) {
        window.matchMedia = nativeToStr(function matchMedia(q) {
          const mql = N.matchMedia(q);
          if (typeof q === 'string' && /\bprint\b|\bpage\b/i.test(q)) {
            try { N.DP(mql, 'matches', { get: () => false, configurable: true, enumerable: true }); }
            catch (_) {}
          }
          return mql;
        }, 'matchMedia');
      }
      if (N.print) {
        window.print = nativeToStr(function print() { return N.print(); }, 'print');
      }
    } else {
      if (!_matchMediaPatched) return;
      _matchMediaPatched = false;
      if (N.matchMedia) window.matchMedia = N.matchMedia;
      if (N.print)      window.print      = N.print;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // teardown — nettoyage complet quand toutes les features sont off.
  // Retire toutes les traces de l'extension du document :
  //   • L4 sentinels retirés du DOM
  //   • MutationObserver déconnecté
  //   • SPA polling interval nettoyé
  //   • <style> element retiré
  //   • EventTarget.prototype.addEventListener restauré au natif
  //   • Listener selectionchange retiré
  // L1 (accesseur guard) reste en place : transparent quand S est tout-false
  // et son retrait impliquerait de patcher à nouveau les prototypes.
  // L3 (on* traps) reste en place : vérifie S[key] à chaque appel → no-op.
  // ════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────
  // patchGetSelection — protège window.getSelection contre les overrides.
  // Certains sites écrasent window.getSelection = () => null pour bloquer la
  // sélection de texte même quand user-select est restauré.
  // ─────────────────────────────────────────────────────────────────────────
  function patchGetSelection() {
    const needed = (S.selectstart || S.clipboard) && !!N.getSelection;
    if (needed === _getSelPatched) return;
    _getSelPatched = needed;
    if (needed) {
      try {
        N.DP(window, 'getSelection', {
          get: () => N.getSelection,
          set: () => {},
          configurable: true,
          enumerable  : true,
        });
      } catch (_) {}
    } else {
      try { delete window.getSelection; } catch (_) {}
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // patchClipboardContent — restaure le texte sélectionné original quand un
  // site modifie le clipboard lors d'un copy event (ex : ajoute une source).
  // Intercepte DataTransfer.prototype.setData pendant les copy events.
  // ─────────────────────────────────────────────────────────────────────────
  let _inCopyEvent = false;
  let _copySelText = '';

  function patchClipboardContent() {
    if (!N.DTsetData) return;
    if (S.clipboard) {
      if (_clipboardPatched) return;
      _clipboardPatched = true;
      _clipboardCopyLn = e => {
        _inCopyEvent = true;
        const sel = N.getSelection ? N.getSelection() : window.getSelection();
        _copySelText = sel?.toString() || '';
        N.sT(() => { _inCopyEvent = false; _copySelText = ''; }, 0);
      };
      N.AEL.call(document, 'copy', _clipboardCopyLn, { capture: true, passive: true });
      DataTransfer.prototype.setData = nativeToStr(function setData(type, data) {
        if (_inCopyEvent && _copySelText && type.toLowerCase() === 'text/plain' && data !== _copySelText) {
          return N.DTsetData.call(this, type, _copySelText);
        }
        return N.DTsetData.call(this, type, data);
      }, 'setData');
    } else {
      if (!_clipboardPatched) return;
      _clipboardPatched = false;
      if (_clipboardCopyLn) {
        N.REL.call(document, 'copy', _clipboardCopyLn, { capture: true });
        _clipboardCopyLn = null;
      }
      try { DataTransfer.prototype.setData = N.DTsetData; } catch (_) {}
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // patchShadowDOM — injecte les règles CSS bypass dans les shadow roots.
  // Les paywalls modernes utilisent Shadow DOM pour isoler leur CSS.
  // Notre <style> !important dans le document ne pénètre pas les shadow roots.
  // On hook Element.prototype.attachShadow pour injecter au moment de la création,
  // et on scanne les shadow roots existants au premier applyAll.
  // ─────────────────────────────────────────────────────────────────────────
  function _shadowCSS() {
    const p = [];
    if (S.selectstart)   p.push('*{user-select:auto!important;-webkit-user-select:auto!important}');
    if (S.cursor)        p.push('*{cursor:auto!important;-webkit-touch-callout:default!important}');
    if (S.pointerEvents) p.push('*{pointer-events:auto!important}');
    return p.join('');
  }

  function _injectIntoShadow(root) {
    const css = _shadowCSS();
    if (!css || !root) return;
    let st = _shadowStyles.get(root);
    if (!st) {
      st = document.createElement('style');
      try { root.insertBefore(st, root.firstChild); } catch (_) { return; }
      _shadowStyles.set(root, st);
      _shadowRoots.add(root);
    }
    if (st.textContent !== css) st.textContent = css;
  }

  function _removeFromShadow(root) {
    const st = _shadowStyles.get(root);
    if (st?.isConnected) try { st.remove(); } catch (_) {}
    _shadowStyles.delete(root);
    _shadowRoots.delete(root);
  }

  function patchShadowDOM() {
    const needed = (S.selectstart || S.cursor || S.pointerEvents) && !!N.attachShadow;
    if (needed) {
      if (!_shadowPatched) {
        _shadowPatched = true;
        Element.prototype.attachShadow = nativeToStr(function attachShadow(init) {
          const shadow = N.attachShadow.call(this, init);
          if (anyActive()) _injectIntoShadow(shadow);
          return shadow;
        }, 'attachShadow');
      }
      try {
        document.querySelectorAll('*').forEach(el => {
          if (el.shadowRoot) _injectIntoShadow(el.shadowRoot);
        });
      } catch (_) {}
    } else {
      if (!_shadowPatched) return;
      _shadowPatched = false;
      try { Element.prototype.attachShadow = N.attachShadow; } catch (_) {}
      _shadowRoots.forEach(r => _removeFromShadow(r));
      _shadowRoots.clear();
    }
  }

  function teardown() {
    _removeSentinels();
    if (_obs) { _obs.disconnect(); _obs = null; }
    if (_spaInterval) { clearInterval(_spaInterval); _spaInterval = null; }
    if (_css?.isConnected) _css.remove();
    _css = null; _cssCache = '';
    try { EventTarget.prototype.addEventListener    = N.AEL; } catch (_) {}
    try { EventTarget.prototype.removeEventListener = N.REL; } catch (_) {}
    if (_selChangeLn) {
      N.REL.call(document, 'selectionchange', _selChangeLn, { capture: true });
      _selChangeLn = null;
    }
    try { CSSStyleSheet.prototype.insertRule = N.insertRule; } catch (_) {}
    if (N.replaceSync) { try { CSSStyleSheet.prototype.replaceSync = N.replaceSync; } catch (_) {} }
    if (N.cssReplace)  { try { CSSStyleSheet.prototype.replace     = N.cssReplace;  } catch (_) {} }
    try { CSSStyleDeclaration.prototype.setProperty = N.setProp; } catch (_) {}
    if (N.removeAllRanges && typeof Selection !== 'undefined') {
      try { Selection.prototype.removeAllRanges = N.removeAllRanges; } catch (_) {}
      if (N.selectionEmpty) { try { Selection.prototype.empty = N.selectionEmpty; } catch (_) {} }
      if (N.selToString)    { try { Selection.prototype.toString = N.selToString;  } catch (_) {} }
    }
    if (_debTimer)    { clearTimeout(_debTimer);    _debTimer    = null; }
    if (_ovlDebTimer) { clearTimeout(_ovlDebTimer); _ovlDebTimer = null; }
    if (N.designModeDesc) { try { N.DP(document, 'designMode', N.designModeDesc); } catch (_) {} }
    if (_focusPatched) {
      HTMLElement.prototype.focus = N.focus;
      HTMLElement.prototype.blur  = N.blur;
      _focusPatched = false;
    }
    if (_markListenersAdded) {
      N.REL.call(document, 'pointerdown', _markUserActive, { capture: true });
      N.REL.call(document, 'keydown',     _markUserActive, { capture: true });
      _markListenersAdded = false;
    }
    if (_uiTimer) { clearTimeout(_uiTimer); _uiTimer = null; }
    _userInteracting = false;
    if (_scrollPatched) {
      if (N.scrollTo) window.scrollTo = N.scrollTo;
      if (N.scrollBy) window.scrollBy = N.scrollBy;
      _scrollPatched = false;
    }
    if (_visPatched) {
      ['hidden','webkitHidden','visibilityState','webkitVisibilityState'].forEach(p => {
        const d = N.visDescs?.[p];
        if (d) { try { N.DP(document, p, d); } catch (_) {} }
      });
      try {
        const d = N.GCD(Document.prototype, 'hasFocus');
        if (d) N.DP(document, 'hasFocus', d);
      } catch (_) {}
      _visPatched = false;
    }
    if (_consolePatched) {
      console.clear = N.CC;
      if (_origConsoleLog) {
        try { console.log = nativeToStr(_origConsoleLog, 'log'); } catch (_) {}
        _origConsoleLog = null;
      }
      _consolePatched = false;
    }
    if (_matchMediaPatched) {
      if (N.matchMedia) window.matchMedia = N.matchMedia;
      if (N.print)      window.print      = N.print;
      _matchMediaPatched = false;
    }
    if (_getSelPatched) {
      try { delete window.getSelection; } catch (_) {}
      _getSelPatched = false;
    }
    if (_clipboardPatched) {
      if (_clipboardCopyLn) { N.REL.call(document,'copy',_clipboardCopyLn,{capture:true}); _clipboardCopyLn=null; }
      try { DataTransfer.prototype.setData = N.DTsetData; } catch (_) {}
      _clipboardPatched = false;
    }
    if (_shadowPatched) {
      try { Element.prototype.attachShadow = N.attachShadow; } catch (_) {}
      _shadowRoots.forEach(r => _removeFromShadow(r));
      _shadowRoots.clear();
      _shadowPatched = false;
    }
    _insertRuleActive  = false;
    _setPropActive     = false;
    _adoptedActive     = false;
    _selPatched        = false;
    _designModePatched = false;
  }

  // ════════════════════════════════════════════════════════════════
  // Apply all
  // ════════════════════════════════════════════════════════════════
  function applyAll(phase) {
    if (!anyActive()) {
          teardown();
      return;
    }
    _addSentinels();
    if (!_obs) startObserver();
    if (!_spaInterval) hookSPANavigation();
    applyCSS();
    clearInlineHandlers();
    if (S.dragdrop)  fixDraggable();
    patchVisibility();
    patchFocus();
    patchConsole();
    patchScroll();
    patchInsertRule();
    patchStyleSetProperty();
    patchAdoptedStyleSheets();
    patchSelection();
    patchDesignMode();
    patchPrint();
    patchGetSelection();
    patchClipboardContent();
    patchShadowDOM();
    if (S.devtools)  patchDevtools();
    if (S.overlays)  _idle(autoRemoveOverlays);
    if (phase)       runScripts(phase);
  }

  // ════════════════════════════════════════════════════════════════
  // SECURE MESSAGE BUS
  // ════════════════════════════════════════════════════════════════
  const BUS_IN  = '__wm0__';
  const BUS_OUT = '__wm1__';

  N.AEL.call(window, 'message', function (e) {
    if (!e.data || e.data.__ch !== BUS_IN) return;
    const { __t: tok, action, payload } = e.data;

    // Authentification token
    if (!_tokenSet) {
      if (action === 'init' && typeof tok === 'string' && tok.length >= 32) {
        _authToken = tok;
        _tokenSet  = true;
      } else return;
    } else {
      if (tok !== _authToken) return;
    }

    switch (action) {
      case 'init':
      case 'update': {
        if (action === 'update' && !validatePayload(payload)) return;
        const safe = {};
        Object.keys(payload || {}).forEach(k => { if (ALLOWED_KEYS.has(k)) safe[k] = payload[k]; });
        Object.assign(S, safe);
        if (safe.customScripts) _ran.clear();
        applyAll('document_idle');
        break;
      }
      case 'removeOverlays':    autoRemoveOverlays(); break;
      case 'restoreOverlay':    restoreOverlay(payload?.id); break;
      case 'restoreAllOverlays': [..._overlays.keys()].forEach(id => restoreOverlay(id)); break;
      case 'activatePicker':    activatePicker(); break;
      case 'cancelPicker':      deactivatePicker(false); break;
      case 'getState':
        N.PM({ __ch: BUS_OUT, action: 'state', payload: { ...S } }, '*');
        _sendOverlayList();
        break;
    }
  }, false);

  // ════════════════════════════════════════════════════════════════
  // Bootstrap v3.0.0
  // ════════════════════════════════════════════════════════════════

  // Phase 1 — document_start (immédiat, avant tout)
  // lockPatches() toujours (L1 protections légères, transparentes si inactif).
  // Le reste est conditionnel : si TOUT est désactivé, on ne démarre rien.
  lockPatches();

  if (anyActive()) {
    _addSentinels();   // L4
    applyCSS();
    patchVisibility();
    patchConsole();
    hookSPANavigation();
    runScripts('document_start');
  }

  if (document.readyState === 'loading') {
    N.AEL.call(document, 'DOMContentLoaded', () => {
      if (anyActive()) { applyAll('document_end'); startObserver(); }
    }, { once: true });
  } else {
    if (anyActive()) { applyAll('document_end'); startObserver(); }
  }

  N.AEL.call(window, 'load', () => {
    if (!anyActive()) return; // rien à faire
    applyAll('document_idle');
    N.sT(() => { clearInlineHandlers(); if (S.dragdrop) fixDraggable(); }, 300);
    N.sT(() => { clearInlineHandlers(); if (S.overlays) autoRemoveOverlays(); }, 700);
    N.sT(() => { runScripts('document_idle'); }, 900);
  }, { once: true });

  N.PM({ __ch: BUS_OUT, action: 'ready' }, '*');
})();
