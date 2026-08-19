const FACTORY_DEFAULTS = {
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

const REPO_SLUG = "FRENCH-FLIGHT/Overpass-_-Extension";

const REPO_URL = `https://github.com/${REPO_SLUG}`;

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

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1e3;

function compareVersions(a, b) {
  const pa = String(a || "0").replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  const pb = String(b || "0").replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] || 0, db = pb[i] || 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

async function checkForUpdate(force = false) {
  const current = chrome.runtime.getManifest().version;
  try {
    if (!force) {
      const {updateInfo: updateInfo} = await chrome.storage.local.get({
        updateInfo: null
      });
      if (updateInfo?.checkedAt && Date.now() - updateInfo.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
        return updateInfo;
      }
    }
    const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json"
      }
    });
    if (res.status === 404) {
      const info = {
        latestVersion: null,
        url: `${REPO_URL}/releases`,
        hasUpdate: false,
        noReleases: true,
        checkedAt: Date.now(),
        ok: true
      };
      await chrome.storage.local.set({
        updateInfo: info
      });
      return info;
    }
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    const latestVersion = String(data.tag_name || "").replace(/^v/i, "");
    const info = {
      latestVersion: latestVersion || null,
      url: data.html_url || `${REPO_URL}/releases/latest`,
      hasUpdate: latestVersion ? compareVersions(latestVersion, current) > 0 : false,
      noReleases: false,
      checkedAt: Date.now(),
      ok: true
    };
    await chrome.storage.local.set({
      updateInfo: info
    });
    return info;
  } catch (_) {
    const {updateInfo: updateInfo} = await chrome.storage.local.get({
      updateInfo: null
    });
    return updateInfo || {
      ok: false,
      checkedAt: Date.now()
    };
  }
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

function generateBusKey() {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

chrome.runtime.onInstalled.addListener(async ({reason: reason}) => {
  await chrome.storage.local.set({
    __op_token: generateToken(),
    __op_bus: generateBusKey()
  });
  if (reason === "install") {
    await chrome.storage.sync.set({
      ...FACTORY_DEFAULTS,
      customScripts: "[]",
      language: "fr",
      theme: "dark",
      userDefaults: null,
      excludedSites: [],
      siteProfiles: {},
      networkBlocking: false
    });
  }
  updateAllBadges();
  checkForUpdate(false);
  syncNetworkBlockingRuleset();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.set({
    __op_token: generateToken(),
    __op_bus: generateBusKey()
  });
  updateAllBadges();
  checkForUpdate(false);
  syncNetworkBlockingRuleset();
});

async function syncNetworkBlockingRuleset() {
  try {
    const {networkBlocking: networkBlocking} = await chrome.storage.sync.get({
      networkBlocking: false
    });
    if (networkBlocking) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [ "antiadblock" ]
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [ "antiadblock" ]
      });
    }
  } catch (_) {}
}

chrome.storage.onChanged.addListener(changes => {
  if (changes.networkBlocking) syncNetworkBlockingRuleset();
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  switch (msg.action) {
   case "getFactoryDefaults":
    reply({
      defaults: FACTORY_DEFAULTS
    });
    return true;

   case "checkUpdate":
    checkForUpdate(true).then(reply);
    return true;

   case "getUpdateInfo":
    chrome.storage.local.get({
      updateInfo: null
    }).then(({updateInfo: updateInfo}) => reply(updateInfo));
    return true;

   default:
    return false;
  }
});

const BADGE_COLOR_ACTIVE = "#22c55e";

const BADGE_COLOR_PROFILE = "#a78bfa";

const BADGE_COLOR_NEUTRAL = "#64748b";

function hostnameOf(url) {
  try {
    return new URL(url).hostname || "";
  } catch (_) {
    return "";
  }
}

async function updateBadge(tabId) {
  if (!tabId) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    const host = tab?.url ? hostnameOf(tab.url) : "";
    const stored = await chrome.storage.sync.get({
      ...FACTORY_DEFAULTS,
      excludedSites: [],
      siteProfiles: {}
    });
    const excludedSites = Array.isArray(stored.excludedSites) ? stored.excludedSites : [];
    if (host && hostInList(host, excludedSites)) {
      await chrome.action.setBadgeText({
        text: "–",
        tabId: tabId
      });
      await chrome.action.setBadgeBackgroundColor({
        color: BADGE_COLOR_NEUTRAL,
        tabId: tabId
      });
      return;
    }
    const siteProfiles = stored.siteProfiles && typeof stored.siteProfiles === "object" ? stored.siteProfiles : {};
    const profile = host ? findSiteProfile(host, siteProfiles) : null;
    const effective = profile && typeof profile === "object" ? {
      ...stored,
      ...profile
    } : stored;
    const active = Object.keys(FACTORY_DEFAULTS).filter(k => effective[k]).length;
    await chrome.action.setBadgeText({
      text: active > 0 ? String(active) : "",
      tabId: tabId
    });
    await chrome.action.setBadgeBackgroundColor({
      color: profile ? BADGE_COLOR_PROFILE : active > 0 ? BADGE_COLOR_ACTIVE : BADGE_COLOR_NEUTRAL,
      tabId: tabId
    });
  } catch (_) {}
}

async function updateAllBadges() {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(t => updateBadge(t.id));
  } catch (_) {}
}

chrome.tabs.onActivated.addListener(({tabId: tabId}) => updateBadge(tabId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) updateBadge(tabId);
});

chrome.storage.onChanged.addListener(() => updateAllBadges());

chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (command === "toggle-all") {
    try {
      const stored = await chrome.storage.sync.get(FACTORY_DEFAULTS);
      const anyOn = Object.keys(FACTORY_DEFAULTS).some(k => stored[k]);
      const next = {};
      Object.keys(FACTORY_DEFAULTS).forEach(k => {
        next[k] = !anyOn;
      });
      await chrome.storage.sync.set(next);
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: "updateSettings",
            settings: next
          });
        } catch (_) {}
      }
    } catch (_) {}
    return;
  }
  if (command === "toggle-site-exclusion") {
    if (!tab?.url) return;
    let hostname = "";
    try {
      hostname = new URL(tab.url).hostname;
    } catch (_) {}
    if (!hostname) return;
    try {
      const {excludedSites: excludedSites} = await chrome.storage.sync.get({
        excludedSites: []
      });
      const list = Array.isArray(excludedSites) ? excludedSites : [];
      const next = hostInList(hostname, list) ? list.filter(entry => !hostMatchesPattern(hostname, entry)) : [ ...new Set([ ...list, hostname ]) ];
      await chrome.storage.sync.set({
        excludedSites: next
      });
    } catch (_) {}
  }
});
