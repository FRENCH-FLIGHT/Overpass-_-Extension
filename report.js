const REPO_SLUG = "FRENCH-FLIGHT/Overpass-_-Extension";

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

const LOCALE_MAP = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE"
};

const I18N = {
  fr: {
    reportPageTitle: "Signaler un problème",
    reportPageTitleSite: host => `Signaler un problème sur ${host}`,
    reportPageHint: 'Ce rapport n’est envoyé nulle part automatiquement. Complétez-le puis cliquez sur "Ouvrir sur GitHub" pour le publier vous-même — vous pourrez encore le modifier là-bas avant de le soumettre.',
    reportContextLabel: "Contexte détecté automatiquement",
    reportTitleLabel: "Titre",
    reportDescLabel: "Description",
    reportDescHint: "Décrivez ce qui ne fonctionne pas, sur quel site, et comment le reproduire.",
    reportDescPlaceholder: "Ex : la sélection de texte ne fonctionne plus sur les pages d'article après le dernier changement…",
    reportPreviewLabel: "Aperçu du rapport final",
    reportOpenGithub: "Ouvrir sur GitHub",
    reportCopy: "Copier le rapport",
    toastCopied: "✓ Rapport copié",
    toastCopyFailed: "Échec de la copie",
    toastDraftRestored: "📝 Brouillon restauré",
    ctxDate: "Généré le",
    ctxVersion: "Version",
    ctxBrowser: "Navigateur",
    ctxLanguage: "Langue",
    ctxSite: "Site",
    ctxExcluded: "Exclu",
    ctxProfile: "Profil de site",
    ctxActive: "Protections actives",
    ctxOs: "Système",
    reportNoSiteOption: "Aucun site en particulier",
    reportSiteSelectLabel: "Site concerné",
    yesLabel: "Oui",
    noLabel: "Non",
    generalIssueTitle: "[Bug] ",
    siteIssueTitle: host => `[Bug] Bypass inefficace sur ${host}`,
    technicalSectionTitle: "Contexte technique",
    descSectionTitle: "Description",
    noDescProvided: "*(aucune description fournie)*"
  },
  en: {
    reportPageTitle: "Report an issue",
    reportPageTitleSite: host => `Report an issue on ${host}`,
    reportPageHint: 'This report is never sent automatically. Fill it in, then click "Open on GitHub" to publish it yourself — you can still edit it there before submitting.',
    reportContextLabel: "Automatically detected context",
    reportTitleLabel: "Title",
    reportDescLabel: "Description",
    reportDescHint: "Describe what isn’t working, on which site, and how to reproduce it.",
    reportDescPlaceholder: "E.g.: text selection stopped working on article pages after the latest change…",
    reportPreviewLabel: "Final report preview",
    reportOpenGithub: "Open on GitHub",
    reportCopy: "Copy report",
    toastCopied: "✓ Report copied",
    toastCopyFailed: "Copy failed",
    toastDraftRestored: "📝 Draft restored",
    ctxDate: "Generated on",
    ctxVersion: "Version",
    ctxBrowser: "Browser",
    ctxLanguage: "Language",
    ctxSite: "Site",
    ctxExcluded: "Excluded",
    ctxProfile: "Site profile",
    ctxActive: "Active protections",
    ctxOs: "OS",
    reportNoSiteOption: "No specific site",
    reportSiteSelectLabel: "Site concerned",
    yesLabel: "Yes",
    noLabel: "No",
    generalIssueTitle: "[Bug] ",
    siteIssueTitle: host => `[Bug] Bypass not working on ${host}`,
    technicalSectionTitle: "Technical context",
    descSectionTitle: "Description",
    noDescProvided: "*(no description provided)*"
  },
  es: {
    reportPageTitle: "Reportar un problema",
    reportPageTitleSite: host => `Reportar un problema en ${host}`,
    reportPageHint: 'Este informe nunca se envía automáticamente. Complétalo y pulsa "Abrir en GitHub" para publicarlo tú mismo — aún podrás editarlo allí antes de enviarlo.',
    reportContextLabel: "Contexto detectado automáticamente",
    reportTitleLabel: "Título",
    reportDescLabel: "Descripción",
    reportDescHint: "Describe qué no funciona, en qué sitio, y cómo reproducirlo.",
    reportDescPlaceholder: "Ej.: la selección de texto dejó de funcionar en páginas de artículos tras el último cambio…",
    reportPreviewLabel: "Vista previa del informe final",
    reportOpenGithub: "Abrir en GitHub",
    reportCopy: "Copiar informe",
    toastCopied: "✓ Informe copiado",
    toastCopyFailed: "Error al copiar",
    toastDraftRestored: "📝 Borrador restaurado",
    ctxDate: "Generado el",
    ctxVersion: "Versión",
    ctxBrowser: "Navegador",
    ctxLanguage: "Idioma",
    ctxSite: "Sitio",
    ctxExcluded: "Excluido",
    ctxProfile: "Perfil de sitio",
    ctxActive: "Protecciones activas",
    ctxOs: "Sistema",
    reportNoSiteOption: "Ningún sitio en particular",
    reportSiteSelectLabel: "Sitio afectado",
    yesLabel: "Sí",
    noLabel: "No",
    generalIssueTitle: "[Bug] ",
    siteIssueTitle: host => `[Bug] Bypass no funciona en ${host}`,
    technicalSectionTitle: "Contexto técnico",
    descSectionTitle: "Descripción",
    noDescProvided: "*(sin descripción)*"
  },
  de: {
    reportPageTitle: "Problem melden",
    reportPageTitleSite: host => `Problem auf ${host} melden`,
    reportPageHint: 'Dieser Bericht wird nie automatisch gesendet. Fülle ihn aus und klicke auf "Auf GitHub öffnen", um ihn selbst zu veröffentlichen — du kannst ihn dort vor dem Absenden noch bearbeiten.',
    reportContextLabel: "Automatisch erkannter Kontext",
    reportTitleLabel: "Titel",
    reportDescLabel: "Beschreibung",
    reportDescHint: "Beschreibe, was nicht funktioniert, auf welcher Seite, und wie man es reproduziert.",
    reportDescPlaceholder: "Z. B.: Textauswahl funktioniert seit dem letzten Update auf Artikelseiten nicht mehr…",
    reportPreviewLabel: "Vorschau des endgültigen Berichts",
    reportOpenGithub: "Auf GitHub öffnen",
    reportCopy: "Bericht kopieren",
    toastCopied: "✓ Bericht kopiert",
    toastCopyFailed: "Kopieren fehlgeschlagen",
    toastDraftRestored: "📝 Entwurf wiederhergestellt",
    ctxDate: "Erstellt am",
    ctxVersion: "Version",
    ctxBrowser: "Browser",
    ctxLanguage: "Sprache",
    ctxSite: "Seite",
    ctxExcluded: "Ausgeschlossen",
    ctxProfile: "Seitenprofil",
    ctxActive: "Aktive Schutzfunktionen",
    ctxOs: "System",
    reportNoSiteOption: "Keine bestimmte Seite",
    reportSiteSelectLabel: "Betroffene Seite",
    yesLabel: "Ja",
    noLabel: "Nein",
    generalIssueTitle: "[Bug] ",
    siteIssueTitle: host => `[Bug] Bypass funktioniert nicht auf ${host}`,
    technicalSectionTitle: "Technischer Kontext",
    descSectionTitle: "Beschreibung",
    noDescProvided: "*(keine Beschreibung angegeben)*"
  }
};

let lang = "fr";

function t(key, ...args) {
  const tr = I18N[lang] || I18N.fr;
  const v = tr[key] ?? I18N.fr[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
}

function setText(el, text) {
  if (el) el.textContent = String(text);
}

function browserInfo() {
  const ua = navigator.userAgent || "";
  let m;
  if (m = ua.match(/Edg\/([\d.]+)/)) return {
    name: "Edge",
    version: m[1]
  };
  if (m = ua.match(/OPR\/([\d.]+)/)) return {
    name: "Opera",
    version: m[1]
  };
  if (/Brave/.test(ua)) {
    m = ua.match(/Chrome\/([\d.]+)/);
    return {
      name: "Brave",
      version: m ? m[1] : "?"
    };
  }
  if (m = ua.match(/Chrome\/([\d.]+)/)) return {
    name: "Chrome",
    version: m[1]
  };
  if (m = ua.match(/Firefox\/([\d.]+)/)) return {
    name: "Firefox",
    version: m[1]
  };
  if (m = ua.match(/Version\/([\d.]+).*Safari/)) return {
    name: "Safari",
    version: m[1]
  };
  return {
    name: "Unknown",
    version: "?"
  };
}

function osLabel() {
  const ua = navigator.userAgent || "";
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

function formatToggleDetails(effective) {
  return Object.keys(FACTORY_DEFAULTS).map(k => `${k}: ${effective[k] ? "ON" : "OFF"}`).join(", ");
}

async function listOpenHostnames() {
  try {
    const tabs = await chrome.tabs.query({});
    const hosts = new Set;
    tabs.forEach(tab => {
      if (!tab.url) return;
      try {
        const u = new URL(tab.url);
        if (u.protocol === "http:" || u.protocol === "https:") hosts.add(u.hostname);
      } catch (_) {}
    });
    return [ ...hosts ].sort();
  } catch (_) {
    return [];
  }
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

function getEffectiveSiteConfig(hostname, cfg, excludedSites, siteProfiles) {
  if (!hostname) return {
    ...cfg
  };
  if (hostInList(hostname, excludedSites)) {
    const off = {};
    Object.keys(FACTORY_DEFAULTS).forEach(k => {
      off[k] = false;
    });
    return off;
  }
  const profile = findSiteProfile(hostname, siteProfiles);
  return profile ? {
    ...cfg,
    ...profile
  } : {
    ...cfg
  };
}

function formatDate() {
  const locale = LOCALE_MAP[lang] || "en-US";
  try {
    return (new Date).toLocaleString(locale, {
      dateStyle: "long",
      timeStyle: "short"
    });
  } catch (_) {
    return (new Date).toISOString();
  }
}

function addContextRow(grid, key, val) {
  const k = document.createElement("div");
  k.className = "context-key";
  k.textContent = key;
  const v = document.createElement("div");
  v.className = "context-val";
  v.textContent = val;
  grid.appendChild(k);
  grid.appendChild(v);
}

function buildMarkdown(state) {
  const desc = (document.getElementById("reportDesc")?.value || "").trim();
  const lines = [];
  lines.push(`### ${t("descSectionTitle")}`);
  lines.push("");
  lines.push(desc || t("noDescProvided"));
  lines.push("");
  lines.push("---");
  lines.push(`### ${t("technicalSectionTitle")}`);
  lines.push("");
  lines.push(`- ${t("ctxDate")}: ${state.date}`);
  lines.push(`- ${t("ctxVersion")}: v${state.version}`);
  lines.push(`- ${t("ctxBrowser")}: ${state.browser} ${state.browserVersion}`);
  lines.push(`- ${t("ctxOs")}: ${state.os}`);
  lines.push(`- ${t("ctxLanguage")}: ${state.lang}`);
  if (state.hostname) {
    lines.push(`- ${t("ctxSite")}: ${state.hostname}`);
    lines.push(`- ${t("ctxExcluded")}: ${state.excluded ? t("yesLabel") : t("noLabel")}`);
    lines.push(`- ${t("ctxProfile")}: ${state.hasProfile ? t("yesLabel") : t("noLabel")}`);
  }
  lines.push(`- ${t("ctxActive")}: ${state.toggleDetails}`);
  return lines.join("\n");
}

function renderPreview(state) {
  const preview = document.getElementById("reportPreview");
  if (preview) preview.textContent = buildMarkdown(state);
}

function toast(msg, type = "ok", ms = 2200) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = String(msg);
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove("show"), ms);
}

function draftKey(hostname) {
  return hostname ? `reportDraft_site_${hostname}` : "reportDraft_general";
}

let draftSaveTimer = null;

function scheduleDraftSave(hostname, titleInput, descInput) {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(async () => {
    const title = titleInput?.value || "";
    const desc = descInput?.value || "";
    try {
      await chrome.storage.local.set({
        [draftKey(hostname)]: {
          title: title,
          desc: desc,
          savedAt: Date.now()
        }
      });
    } catch (_) {}
  }, 600);
}

async function loadDraft(hostname) {
  try {
    const key = draftKey(hostname);
    const result = await chrome.storage.local.get({
      [key]: null
    });
    return result[key];
  } catch (_) {
    return null;
  }
}

async function clearDraft(hostname) {
  try {
    await chrome.storage.local.remove(draftKey(hostname));
  } catch (_) {}
}

async function init() {
  const params = new URLSearchParams(location.search);
  const hostname = params.get("site") || "";
  const stored = await chrome.storage.sync.get({
    ...FACTORY_DEFAULTS,
    language: "fr",
    theme: "dark",
    excludedSites: [],
    siteProfiles: {}
  });
  lang = [ "fr", "en", "es", "de" ].includes(stored.language) ? stored.language : "fr";
  const theme = stored.theme === "light" ? "light" : "dark";
  document.body.classList.remove("dark", "light");
  document.body.classList.add(theme);
  const {language: _l, theme: _t, excludedSites: excludedSites, siteProfiles: siteProfiles, ...cfg} = stored;
  const safeExcluded = Array.isArray(excludedSites) ? excludedSites : [];
  const safeProfiles = siteProfiles && typeof siteProfiles === "object" && !Array.isArray(siteProfiles) ? siteProfiles : {};
  const {name: browserName, version: browserVersion} = browserInfo();
  const os = osLabel();
  const manifestVersion = chrome.runtime.getManifest().version;
  const dateStr = formatDate();
  function computeState(host) {
    const effective = getEffectiveSiteConfig(host, cfg, safeExcluded, safeProfiles);
    return {
      date: dateStr,
      version: manifestVersion,
      browser: browserName,
      browserVersion: browserVersion,
      os: os,
      lang: lang,
      hostname: host,
      excluded: host ? hostInList(host, safeExcluded) : false,
      hasProfile: host ? !!findSiteProfile(host, safeProfiles) : false,
      toggleDetails: formatToggleDetails(effective)
    };
  }
  function renderContext(state) {
    const grid = document.getElementById("contextGrid");
    if (!grid) return;
    grid.innerHTML = "";
    addContextRow(grid, t("ctxVersion"), `v${state.version}`);
    addContextRow(grid, t("ctxBrowser"), `${state.browser} ${state.browserVersion}`);
    addContextRow(grid, t("ctxOs"), state.os);
    addContextRow(grid, t("ctxLanguage"), state.lang);
    if (state.hostname) {
      addContextRow(grid, t("ctxExcluded"), state.excluded ? t("yesLabel") : t("noLabel"));
      addContextRow(grid, t("ctxProfile"), state.hasProfile ? t("yesLabel") : t("noLabel"));
    }
    addContextRow(grid, t("ctxActive"), state.toggleDetails);
  }
  let state = computeState(hostname);
  document.title = hostname ? t("reportPageTitleSite", hostname) : t("reportPageTitle");
  setText(document.querySelector('[data-i18n="reportPageTitle"]'), hostname ? t("reportPageTitleSite", hostname) : t("reportPageTitle"));
  setText(document.getElementById("reportTimestamp"), `${t("ctxDate")} ${state.date}`);
  document.querySelectorAll("[data-i18n]").forEach(el => {
    if (el.dataset.i18n === "reportPageTitle") return;
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  renderContext(state);
  const siteSelect = document.getElementById("reportSiteSelect");
  if (siteSelect) {
    const openHosts = await listOpenHostnames();
    const options = [ {
      value: "",
      label: t("reportNoSiteOption")
    } ];
    const allHosts = hostname && !openHosts.includes(hostname) ? [ hostname, ...openHosts ] : openHosts;
    allHosts.forEach(h => options.push({
      value: h,
      label: h
    }));
    siteSelect.innerHTML = "";
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      siteSelect.appendChild(el);
    });
    siteSelect.value = hostname || "";
    siteSelect.addEventListener("change", () => {
      const newHost = siteSelect.value;
      state = computeState(newHost);
      document.title = newHost ? t("reportPageTitleSite", newHost) : t("reportPageTitle");
      setText(document.querySelector('[data-i18n="reportPageTitle"]'), newHost ? t("reportPageTitleSite", newHost) : t("reportPageTitle"));
      renderContext(state);
      renderPreview(state);
    });
  }
  const titleInput = document.getElementById("reportTitle");
  const descInput = document.getElementById("reportDesc");
  if (titleInput) {
    titleInput.value = hostname ? t("siteIssueTitle", hostname) : t("generalIssueTitle");
  }
  const draft = await loadDraft(hostname);
  if (draft && (draft.title || draft.desc)) {
    if (titleInput && draft.title) titleInput.value = draft.title;
    if (descInput && draft.desc) descInput.value = draft.desc;
    toast(t("toastDraftRestored"), "info");
  }
  renderPreview(state);
  const onEdit = () => {
    renderPreview(state);
    scheduleDraftSave(siteSelect?.value || hostname, titleInput, descInput);
  };
  titleInput?.addEventListener("input", onEdit);
  descInput?.addEventListener("input", onEdit);
  document.getElementById("btnOpenGithub")?.addEventListener("click", () => {
    const title = (titleInput?.value || "").trim() || t("generalIssueTitle");
    const body = buildMarkdown(state);
    const url = `https://github.com/${REPO_SLUG}/issues/new?` + new URLSearchParams({
      title: title,
      body: body,
      labels: "bug"
    }).toString();
    chrome.tabs.create({
      url: url
    });
    clearDraft(siteSelect?.value || hostname);
  });
  document.getElementById("btnCopyReport")?.addEventListener("click", async () => {
    const title = (titleInput?.value || "").trim();
    const full = (title ? `# ${title}\n\n` : "") + buildMarkdown(state);
    try {
      await navigator.clipboard.writeText(full);
      toast(t("toastCopied"));
    } catch (_) {
      toast(t("toastCopyFailed"), "err");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
