/**
 * Overpass v2.2.2 – inject.js  (world:"MAIN", run_at:"document_start")
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
 */
(function () {
  'use strict';

  // ── Guard (Symbol non-énumérable, invisible à Object.keys) ──────
  const _GUARD = Symbol('__ua');
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
    scrollTo   : window.scrollTo?.bind(window)   || null,
    scrollBy   : window.scrollBy?.bind(window)   || null,
    insertRule : CSSStyleSheet.prototype.insertRule,
    create     : document.createElement.bind(document),
    perfNow    : performance.now.bind(performance),
  };

  // Rend une fonction patchée indiscernable du natif
  function nativeToStr(fn, name) {
    try {
      Object.defineProperty(fn, 'name', { value: name, configurable: true });
      fn.toString = function () { return `function ${name}() { [native code] }`; };
      fn.toString.toString = function () { return `function toString() { [native code] }`; };
    } catch (_) {}
    return fn;
  }

  // ── Token d'authentification postMessage ─────────────────────────
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
    for (const k of Object.keys(p)) if (!ALLOWED_KEYS.has(k)) return false;
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
    onbeforeprint : 'print',
    onblur        : 'focus',
  };

  function blocked(ev) {
    const k = EV[ev.type];
    if (!k || !S[k]) return false;
    // Keyboard : ne jamais bloquer sur les éléments interactifs pour les
    // touches sans modificateur — évite de casser les formulaires, modales,
    // sliders, éditeurs custom. On bloque quand même Ctrl/Meta+key (qui sont
    // les raccourcis que les sites bloquent abusivement).
    if (k === 'keyboard') {
      if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        const tgt = ev.target;
        if (tgt && tgt !== document && tgt !== document.documentElement && tgt !== document.body) {
          const tag = tgt.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
              tag === 'BUTTON' || tgt.isContentEditable) {
            return false;
          }
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
  const _wmap = new WeakMap();

  EventTarget.prototype.addEventListener = nativeToStr(function addEventListener(type, fn, opts) {
    const h = typeof fn === 'function' ? fn
            : (fn && typeof fn.handleEvent === 'function') ? fn.handleEvent.bind(fn)
            : null;
    if (h && EV[type]) {
      let w = _wmap.get(fn);
      if (!w) {
        // On utilise blocked(ev) (pas juste S[k]) pour que L2 soit cohérent
        // avec L1 : les exemptions (keyboard sur INPUT/TEXTAREA…) s'appliquent
        // aussi ici, évitant de casser les handlers légitimes sur les formulaires.
        w = function (e) {
          if (blocked(e)) {
            const p = e.preventDefault, s = e.stopPropagation, si = e.stopImmediatePropagation;
            e.preventDefault = e.stopPropagation = e.stopImmediatePropagation = function () {};
            try { h.call(this, e); } catch (_) {}
            e.preventDefault = p; e.stopPropagation = s; e.stopImmediatePropagation = si;
          } else {
            h.call(this, e);
          }
        };
        _wmap.set(fn, w);
      }
      return N.AEL.call(this, type, w, opts);
    }
    return N.AEL.call(this, type, fn, opts);
  }, 'addEventListener');

  EventTarget.prototype.removeEventListener = nativeToStr(function removeEventListener(type, fn, opts) {
    return N.REL.call(this, type, _wmap.get(fn) ?? fn, opts);
  }, 'removeEventListener');

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
  // L4 — Capture-phase sentinels
  // S'exécute avant tout listener de la page.
  // ════════════════════════════════════════════════════════════════
  Object.keys(EV).forEach(type => {
    N.AEL.call(document, type, e => {
      if (!blocked(e)) return;
      try {
        N.DP(e, 'defaultPrevented', { get: () => false, configurable: true });
      } catch (_) {}
    }, { capture: true, passive: false });
  });

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
        `*{cursor:auto!important}`,
        `a,button,[role="button"],[onclick],[tabindex="0"]{cursor:pointer!important}`,
        `input[type="text"],input[type="search"],input[type="email"],input[type="password"],` +
        `input[type="url"],input[type="number"],textarea,[contenteditable="true"],[contenteditable=""]{cursor:text!important}`
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
      _css = N.create('style');
      _css.setAttribute('data-op', '1');
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
  const INTERACTIVE_TAGS = new Set(['INPUT','TEXTAREA','SELECT','BUTTON','OPTION','OPTGROUP']);

  // Sélecteur CSS mis en cache — ON ne mute jamais après initialisation.
  // Évite de reconstruire la string à chaque appel de clearInlineHandlers.
  const _ON_SEL = Object.keys(ON).map(p => `[${p}]`).join(',');

  function clearInlineHandlers(root) {
    const nodes = root
      ? [root]
      : [document, document.documentElement, document.body, window];
    nodes.filter(Boolean).forEach(node => {
      Object.entries(ON).forEach(([prop, key]) => {
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
          Object.entries(ON).forEach(([prop, key]) => {
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
    if (!S.visibility) return;
    ['hidden', 'webkitHidden'].forEach(p => {
      try { N.DP(document, p, { get: () => false, configurable: true, enumerable: true }); } catch (_) {}
    });
    ['visibilityState', 'webkitVisibilityState'].forEach(p => {
      try { N.DP(document, p, { get: () => 'visible', configurable: true, enumerable: true }); } catch (_) {}
    });
    // Certains sites utilisent document.hasFocus() pour détecter un changement d'onglet.
    // On le spoofle également pour compléter le bypass visibilité.
    try {
      N.DP(document, 'hasFocus', {
        value: nativeToStr(function hasFocus() { return true; }, 'hasFocus'),
        configurable: true, writable: true,
      });
    } catch (_) {}
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
      console.clear = nativeToStr(function clear() {}, 'clear');
      try {
        const _log = console.log.bind(console);
        console.log = nativeToStr(function log(...args) {
          return _log(...args.map(a => {
            if (a && typeof a === 'object') {
              try { if (/devtools/i.test(String(a))) return '[object Object]'; } catch (_) {}
            }
            return a;
          }));
        }, 'log');
      } catch (_) {}
    } else {
      console.clear = N.CC;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SPA Navigation hook
  // Re-applique les protections après pushState/replaceState/popstate.
  // ════════════════════════════════════════════════════════════════
  function hookSPANavigation() {
    const rewrap = () => N.sT(() => { clearInlineHandlers(); if (S.dragdrop) fixDraggable(); applyCSS(); }, 100);
    try {
      const _push = history.pushState.bind(history);
      history.pushState = nativeToStr(function pushState(...args) {
        const r = _push(...args); rewrap(); return r;
      }, 'pushState');
    } catch (_) {}
    try {
      const _rep = history.replaceState.bind(history);
      history.replaceState = nativeToStr(function replaceState(...args) {
        const r = _rep(...args); rewrap(); return r;
      }, 'replaceState');
    } catch (_) {}
    N.AEL.call(window, 'popstate',   rewrap);
    N.AEL.call(window, 'hashchange', rewrap);
    // Polling de sécurité : couvre les frameworks qui changent location.href
    // sans passer par history API (Svelte, Astro, Qwik, certains routers…).
    // Coût : ~0.01 ms/tick à 1 Hz, négligeable.
    let _lastHref = location.href;
    N.sI(() => {
      if (location.href !== _lastHref) { _lastHref = location.href; rewrap(); }
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
  N.AEL.call(document, 'pointerdown', _markUserActive, { capture: true, passive: true });
  N.AEL.call(document, 'keydown',     _markUserActive, { capture: true, passive: true });

  function patchFocus() {
    if (S.focus) {
      HTMLElement.prototype.focus = nativeToStr(function focus(o) {
        if (_userInteracting) return N.focus.call(this, o);
      }, 'focus');
      HTMLElement.prototype.blur = nativeToStr(function blur() {
        if (_userInteracting) return N.blur.call(this);
      }, 'blur');
    } else {
      HTMLElement.prototype.focus = N.focus;
      HTMLElement.prototype.blur  = N.blur;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // OVERLAY MANAGER
  // ════════════════════════════════════════════════════════════════
  const _overlays = new Map();
  let _ovCnt = 0;

  function _elDesc(el) {
    const id  = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const txt = (el.innerText || '').trim().slice(0, 24).replace(/\s+/g, ' ');
    return `<${el.tagName.toLowerCase()}${id || cls}>${txt ? ` "${txt}"` : ''}`;
  }

  function hideOverlay(el, auto = false) {
    if (!el || el.dataset?.uaOvId) return;
    const id = `ov_${++_ovCnt}`;
    _overlays.set(id, {
      el, origDisplay: el.style.display, origVis: el.style.visibility,
      origOp: el.style.opacity, desc: _elDesc(el), auto, ts: Date.now(),
    });
    try { el.dataset.uaOvId = id; } catch (_) {}
    el.style.setProperty('display', 'none', 'important');
    _sendOverlayList();
  }

  function restoreOverlay(id) {
    const e = _overlays.get(id);
    if (!e) return;
    e.el.style.display    = e.origDisplay;
    e.el.style.visibility = e.origVis;
    e.el.style.opacity    = e.origOp;
    try { delete e.el.dataset.uaOvId; } catch (_) {}
    _overlays.delete(id);
    _sendOverlayList();
  }

  function _sendOverlayList() {
    const list = [..._overlays.entries()].map(([id, { desc, auto, ts }]) => ({ id, desc, auto, ts }));
    N.PM({ __ch: BUS_OUT, action: 'overlayList', payload: list }, '*');
  }

  function autoRemoveOverlays() {
    if (!S.overlays) return;
    try {
      document.querySelectorAll('div,section,aside,article,header').forEach(el => {
        if (el.dataset?.uaOvId) return;
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
        document.body?.style.setProperty(p, 'auto', 'important');
        document.documentElement?.style.setProperty(p, 'auto', 'important');
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
      } catch (e) {
        console.warn(`[Overpass] Script "${sc.name}":`, e.message);
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
      window.scrollTo = nativeToStr(function scrollTo() {}, 'scrollTo');
      window.scrollBy = nativeToStr(function scrollBy() {}, 'scrollBy');
    } else {
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
  function patchInsertRule() {
    if (!S.selectstart && !S.cursor) {
      // Aucune protection active : restaurer la méthode native
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
  // Apply all
  // ════════════════════════════════════════════════════════════════
  function applyAll(phase) {
    applyCSS();
    clearInlineHandlers();
    if (S.dragdrop)  fixDraggable();
    patchVisibility();
    patchFocus();
    patchConsole();
    patchScroll();
    patchInsertRule();
    if (S.devtools)  patchDevtools();
    if (S.overlays)  autoRemoveOverlays();
    if (phase)       runScripts(phase);
  }

  // ════════════════════════════════════════════════════════════════
  // SECURE MESSAGE BUS
  // ════════════════════════════════════════════════════════════════
  const BUS_IN  = '__op_c2p__';
  const BUS_OUT = '__op_p2c__';

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
  // Bootstrap v2.2.2
  // ════════════════════════════════════════════════════════════════

  // Phase 1 — document_start (immédiat, avant tout)
  applyCSS();
  patchVisibility();
  patchConsole();
  hookSPANavigation();
  runScripts('document_start');

  if (document.readyState === 'loading') {
    N.AEL.call(document, 'DOMContentLoaded', () => {
      applyAll('document_end');
      startObserver();
    }, { once: true });
  } else {
    applyAll('document_end');
    startObserver();
  }

  N.AEL.call(window, 'load', () => {
    applyAll('document_idle');
    N.sT(() => { clearInlineHandlers(); if (S.dragdrop) fixDraggable(); }, 300);
    N.sT(() => { clearInlineHandlers(); if (S.overlays) autoRemoveOverlays(); }, 700);
    N.sT(() => { runScripts('document_idle'); }, 900);
  }, { once: true });

  N.PM({ __ch: BUS_OUT, action: 'ready' }, '*');
})();
