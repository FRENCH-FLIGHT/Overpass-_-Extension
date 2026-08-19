(function() {
  "use strict";
  const BUS_IN_FIXED = "__wm0__";
  const BUS_OUT_FIXED = "__wm1__";
  let BUS_IN_SESSION = null;
  let BUS_OUT_SESSION = null;
  let busKey = null;
  function currentBusIn() {
    return BUS_IN_SESSION || BUS_IN_FIXED;
  }
  const A_INIT = "j1", A_UPDATE = "j2", A_RM_OVERLAYS = "j3", A_RS_OVERLAY = "j4", A_RS_ALL = "j5", A_PICK_ON = "j6", A_PICK_OFF = "j7", A_GET_STATE = "j8";
  const R_READY = "k1", R_OVERLAY_LIST = "k2", R_STATE = "k3", R_PICK_DONE = "k4", R_PICK_CANCEL = "k5";
  const DEFAULTS = {
    contextmenu: true,
    selectstart: true,
    clipboard: true,
    keyboard: true,
    dragdrop: true,
    scroll: false,
    cursor: true,
    pointerEvents: false,
    print: true,
    overlays: false,
    devtools: false,
    consoleProtect: false,
    focus: false,
    visibility: true,
    zoom: true,
    darkMode: false
  };
  let token = null;
  let current = {
    ...DEFAULTS,
    customScripts: [],
    lang: "fr",
    excluded: false,
    siteOverride: null
  };
  let ready = false;
  let pending = null;
  function sanitizeProfile(p) {
    if (!p || typeof p !== "object") return null;
    const safe = {};
    let any = false;
    Object.keys(DEFAULTS).forEach(k => {
      if (k in p) {
        safe[k] = !!p[k];
        any = true;
      }
    });
    return any ? safe : null;
  }
  function hostMatchesPattern(host, pattern) {
    if (!host || typeof pattern !== "string") return false;
    const p = pattern.trim().toLowerCase();
    if (!p) return false;
    const h = host.toLowerCase();
    if (p.startsWith("*.")) {
      const base = p.slice(2);
      return !!base && (h === base || h.endsWith("." + base));
    }
    return h === p;
  }
  function hostInList(host, list) {
    return Array.isArray(list) && list.some(entry => hostMatchesPattern(host, entry));
  }
  function findSiteProfile(host, profiles) {
    if (!host || !profiles || typeof profiles !== "object") return null;
    if (profiles[host]) return profiles[host];
    let best = null, bestLen = -1;
    Object.keys(profiles).forEach(key => {
      const p = key.trim().toLowerCase();
      if (!p.startsWith("*.")) return;
      const base = p.slice(2);
      if (base && hostMatchesPattern(host, key) && base.length > bestLen) {
        best = profiles[key];
        bestLen = base.length;
      }
    });
    return best;
  }
  function toInject(action, payload = {}) {
    if (!token) return;
    const msg = {
      __ch: currentBusIn(),
      __t: token,
      action: action,
      payload: payload
    };
    if (busKey && !BUS_IN_SESSION) {
      msg.__bus = busKey;
      BUS_IN_SESSION = "__wm0_" + busKey;
      BUS_OUT_SESSION = "__wm1_" + busKey;
    }
    window.postMessage(msg, window.location.origin || "*");
  }
  function effectivePayload() {
    if (current.excluded) {
      const off = {};
      Object.keys(DEFAULTS).forEach(k => {
        off[k] = false;
      });
      return {
        ...off,
        customScripts: [],
        lang: current.lang
      };
    }
    const {excluded: excluded, siteOverride: siteOverride, ...rest} = current;
    return siteOverride ? {
      ...rest,
      ...siteOverride
    } : rest;
  }
  function pushToInject(action) {
    const payload = effectivePayload();
    if (action === A_INIT && !ready) {
      pending = payload;
      return;
    }
    toInject(action, payload);
  }
  function setupMessageListener() {
    window.addEventListener("message", e => {
      if (!e.data) return;
      const ch = e.data.__ch;
      if (ch !== BUS_OUT_FIXED && ch !== BUS_OUT_SESSION) return;
      const {action: action, payload: payload} = e.data;
      if (action === R_READY) {
        ready = true;
        if (pending) {
          toInject(A_INIT, pending);
          pending = null;
        }
        return;
      }
      const relay = {
        [R_OVERLAY_LIST]: "overlayList",
        [R_STATE]: "state",
        [R_PICK_DONE]: "pickerDone",
        [R_PICK_CANCEL]: "pickerCancelled"
      }[action];
      if (relay) {
        try {
          chrome.runtime.sendMessage({
            action: relay,
            payload: payload
          });
        } catch (_) {}
      }
    });
  }
  function loadAndApply() {
    chrome.storage.sync.get({
      ...DEFAULTS,
      customScripts: "[]",
      language: "fr",
      excludedSites: [],
      siteProfiles: {}
    }, raw => {
      let scripts = [];
      try {
        scripts = JSON.parse(raw.customScripts ?? "[]");
      } catch (_) {}
      const {language: language, customScripts: _rawScripts, excludedSites: excludedSites, siteProfiles: siteProfiles, ...toggles} = raw;
      const excluded = Array.isArray(excludedSites) && hostInList(location.hostname, excludedSites);
      const rawProfile = siteProfiles && typeof siteProfiles === "object" ? findSiteProfile(location.hostname, siteProfiles) : null;
      current = {
        ...DEFAULTS,
        ...toggles,
        customScripts: scripts,
        lang: language || "fr",
        excluded: excluded,
        siteOverride: sanitizeProfile(rawProfile)
      };
      pushToInject(A_INIT);
    });
  }
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    switch (msg.action) {
     case "updateSettings":
      {
        const scripts = msg.settings.customScripts ?? current.customScripts;
        current = {
          ...current,
          ...msg.settings,
          customScripts: scripts
        };
        if (msg.settings.language !== undefined) current.lang = msg.settings.language;
        pushToInject(A_UPDATE);
        reply({
          ok: true
        });
        break;
      }

     case "getSettings":
      reply({
        settings: current
      });
      break;

     case "removeOverlays":
      toInject(A_RM_OVERLAYS);
      reply({
        ok: true
      });
      break;

     case "restoreOverlay":
      toInject(A_RS_OVERLAY, {
        id: msg.id
      });
      reply({
        ok: true
      });
      break;

     case "restoreAllOverlays":
      toInject(A_RS_ALL);
      reply({
        ok: true
      });
      break;

     case "activatePicker":
      toInject(A_PICK_ON);
      reply({
        ok: true
      });
      break;

     case "cancelPicker":
      toInject(A_PICK_OFF);
      reply({
        ok: true
      });
      break;

     case "getState":
      toInject(A_GET_STATE);
      reply({
        ok: true
      });
      break;

     case "ping":
      reply({
        pong: true
      });
      break;
    }
    return true;
  });
  chrome.storage.onChanged.addListener(changes => {
    if (changes.language) {
      current.lang = changes.language.newValue || "fr";
      toInject(A_UPDATE, {
        lang: current.lang
      });
    }
    if (changes.excludedSites) {
      const list = Array.isArray(changes.excludedSites.newValue) ? changes.excludedSites.newValue : [];
      const wasExcluded = current.excluded;
      current.excluded = hostInList(location.hostname, list);
      if (current.excluded !== wasExcluded) pushToInject(A_UPDATE);
    }
    if (changes.siteProfiles) {
      const profiles = changes.siteProfiles.newValue;
      const rawProfile = profiles && typeof profiles === "object" ? findSiteProfile(location.hostname, profiles) : null;
      const next = sanitizeProfile(rawProfile);
      const changed = JSON.stringify(next) !== JSON.stringify(current.siteOverride);
      current.siteOverride = next;
      if (changed) pushToInject(A_UPDATE);
    }
  });
  async function init() {
    const {__op_token: __op_token, __op_bus: __op_bus} = await chrome.storage.local.get([ "__op_token", "__op_bus" ]);
    token = __op_token || null;
    busKey = typeof __op_bus === "string" && /^[a-f0-9]{16,32}$/.test(__op_bus) ? __op_bus : null;
    setupMessageListener();
    loadAndApply();
    setTimeout(() => {
      if (!ready && pending) {
        ready = true;
        toInject(A_INIT, pending);
        pending = null;
      }
    }, 700);
  }
  init();
})();
