/**
 * Overpass v3.0.0 – popup.js
 *
 * Sécurité :
 * - Aucun innerHTML avec données non échappées (XSS safe)
 * - Validation des messages runtime entrants
 * - Aucun eval / new Function dans le contexte popup
 * - Les payloads reçus de content.js sont validés avant usage
 */

// ════════════════════════════════════════════════════════════════
// i18n (FR / EN / ES / DE)
// ════════════════════════════════════════════════════════════════
const I18N = {
  fr:{
    active:'Actif', inactive:'Inactif',
    enableAll:'Tout activer', disableAll:'Tout désactiver',
    picker:'Cibler', cancelPicker:'Annuler ciblage',
    tabProtections:'Protections', tabOverlays:'Overlays',
    tabScripts:'Scripts', tabSettings:'Paramètres',
    groupMouse:'Souris & Sélection', groupClipboard:'Copier-coller & Clavier',
    groupBehavior:'Comportement de page', groupAdvanced:'Avancé', groupTools:'Outils rapides',
    fContextmenu:'Clic droit', dContextmenu:'Réactive le menu qui apparaît avec un clic droit',
    fSelectstart:'Sélection de texte', dSelectstart:'Permet de surligner et copier du texte sur les sites qui le bloquent',
    fCursor:'Curseur de souris', dCursor:"Force l'affichage du curseur quand un site le cache",
    fPointerEvents:'Clics sur les overlays', dPointerEvents:'Rend cliquable le contenu caché sous les fenêtres bloquantes',
    fClipboard:'Copier / Couper / Coller', dClipboard:'Autorise Ctrl+C, Ctrl+X, Ctrl+V sur les sites qui les désactivent',
    fKeyboard:'Raccourcis clavier', dKeyboard:'Empêche le site de bloquer vos raccourcis habituels',
    fFocus:'Anti-vol de focus', dFocus:"Empêche le site de déplacer automatiquement votre curseur",
    fDragdrop:'Glisser-déposer', dDragdrop:"Rétablit le glisser-déposer d'images, fichiers et liens",
    fScroll:'Défilement de page', dScroll:'Débloque le scroll quand un site fixe la page',
    fPrint:'Impression', dPrint:"Permet d'imprimer ou sauvegarder en PDF les pages qui l'interdisent",
    fVisibility:'Toujours visible', dVisibility:"Fait croire au site que vous êtes toujours sur cet onglet",
    fOverlays:'Masquage auto des popups', dOverlays:'Détecte et masque automatiquement les grandes fenêtres bloquantes',
    fDevtools:'Masquer les outils développeur', dDevtools:'Empêche le site de détecter que vous avez ouvert la console F12',
    fConsole:'Protéger la console', dConsole:"Empêche le site d'effacer les messages dans la console",
    experimental:'Expérimental',
    toolSource:'Code source', toolCopyUrl:'Copier URL', toolIncognito:'Incognito',
    overlayNone:'Aucun overlay masqué', restoreAll:'Tout restaurer',
    overlayEmptyMsg:'Aucun overlay supprimé.', overlayEmptyHint:'Activez la suppression auto ou utilisez Cibler.',
    overlayAuto:'Auto', overlayManual:'Manuel',
    newScript:'Nouveau script', examplesLabel:'Exemples :',
    scriptEmptyMsg:'Aucun script personnalisé.', scriptEmptyHint:"Créez des scripts JS qui s'exécutent sur chaque page.",
    runAtLabel:"Moment d'exécution :",
    runStart:'Au démarrage — avant le contenu',
    runEnd:'DOM prêt (structure chargée)',
    runIdle:'Chargement complet (images, scripts…)',
    deleteScript:'Supprimer', saveScript:'Enregistrer',
    settingLanguage:'Langue / Language', settingTheme:'Apparence',
    themeDark:'Sombre', themeLight:'Clair',
    settingDefaults:'Paramètres par défaut',
    settingDefaultsDesc:'Sauvegardez votre configuration actuelle pour la réappliquer facilement.',
    saveDefaults:'Sauvegarder comme défaut', loadDefaults:'Charger mes défauts',
    settingFactory:'Réinitialisation',
    settingFactoryDesc:'Remet tout à zéro et supprime vos scripts personnalisés.',
    factoryReset:'Restaurer les paramètres usine',
    settingAbout:'À propos', aboutEngine:'Moteur', aboutCompat:'Compatibilité',
    footerSync:'Synchronisé entre les onglets',
    toastEnabled:'✓ Tout activé !', toastDisabled:'Tout désactivé',
    toastDefaultsSaved:'✓ Défauts sauvegardés', toastDefaultsLoaded:'✓ Défauts chargés',
    toastFactoryDone:'✓ Paramètres usine restaurés', toastUrlCopied:'✓ URL copiée',
    toastOverlayRestored:'✓ Overlay restauré', toastAllRestored:'✓ Tous restaurés',
    toastScriptSaved:'✓ Script enregistré', toastScriptDeleted:'Script supprimé',
    toastPicker:'🎯 Cliquez sur un élément…', toastPickerDone:'✓ Élément masqué',
    toastPickerCancelled:'Ciblage annulé', toastCantOpen:'Impossible sur cette page',
    toastNoDefaults:'Aucun défaut sauvegardé',
    toastIncognito:"Activez le mode incognito dans les paramètres de l'extension",
    confirmFactoryTitle:'Réinitialisation',
    confirmFactoryMsg:'Supprimer tous les scripts et restaurer la configuration usine ?',
    confirmDeleteTitle:'Supprimer le script',
    confirmDeleteMsg:'Cette action est irréversible.',
    confirmYes:'Confirmer', confirmCancel:'Annuler',
    overlayX: n => `${n} overlay${n>1?'s':''} masqué${n>1?'s':''}`,
    ago: s => s < 60 ? `il y a ${s}s` : `il y a ${Math.floor(s/60)}min`,
  },
  en:{
    active:'Active', inactive:'Inactive',
    enableAll:'Enable all', disableAll:'Disable all',
    picker:'Pick', cancelPicker:'Cancel pick',
    tabProtections:'Protections', tabOverlays:'Overlays',
    tabScripts:'Scripts', tabSettings:'Settings',
    groupMouse:'Mouse & Selection', groupClipboard:'Clipboard & Keyboard',
    groupBehavior:'Page Behavior', groupAdvanced:'Advanced', groupTools:'Quick Tools',
    fContextmenu:'Right-click', dContextmenu:'Re-enables the native context menu',
    fSelectstart:'Text selection', dSelectstart:'Allows highlighting and copying text on restrictive sites',
    fCursor:'Mouse cursor', dCursor:'Forces cursor display when a site hides it',
    fPointerEvents:'Click-through overlays', dPointerEvents:'Makes content clickable under blocking popups',
    fClipboard:'Copy / Cut / Paste', dClipboard:'Enables Ctrl+C, Ctrl+X, Ctrl+V on restrictive sites',
    fKeyboard:'Keyboard shortcuts', dKeyboard:'Prevents sites from blocking your usual shortcuts',
    fFocus:'Anti-focus steal', dFocus:'Prevents sites from automatically moving your cursor',
    fDragdrop:'Drag & Drop', dDragdrop:'Restores drag and drop of images, files and links',
    fScroll:'Page scrolling', dScroll:'Unblocks scroll when a site freezes the page',
    fPrint:'Print', dPrint:'Allows printing or saving as PDF on restricted pages',
    fVisibility:'Always visible', dVisibility:"Makes the site think you're always on this tab",
    fOverlays:'Auto popup removal', dOverlays:'Detects and hides large blocking windows automatically',
    fDevtools:'Hide developer tools', dDevtools:'Prevents the site from detecting F12 is open',
    fConsole:'Protect console', dConsole:'Prevents the site from clearing console messages',
    experimental:'Experimental',
    toolSource:'Source code', toolCopyUrl:'Copy URL', toolIncognito:'Incognito',
    overlayNone:'No overlays hidden', restoreAll:'Restore all',
    overlayEmptyMsg:'No overlays removed.', overlayEmptyHint:'Enable auto removal or use the Pick button.',
    overlayAuto:'Auto', overlayManual:'Manual',
    newScript:'New script', examplesLabel:'Examples:',
    scriptEmptyMsg:'No custom scripts yet.', scriptEmptyHint:'Create JS scripts that run automatically on every page.',
    runAtLabel:'Execution timing:',
    runStart:'On start — before page content',
    runEnd:'DOM ready (structure loaded)',
    runIdle:'Fully loaded (images, scripts…)',
    deleteScript:'Delete', saveScript:'Save',
    settingLanguage:'Language / Langue', settingTheme:'Appearance',
    themeDark:'Dark', themeLight:'Light',
    settingDefaults:'Default settings',
    settingDefaultsDesc:'Save your current configuration to easily re-apply it.',
    saveDefaults:'Save as default', loadDefaults:'Load my defaults',
    settingFactory:'Reset',
    settingFactoryDesc:'Reset everything: removes custom scripts and restores original settings.',
    factoryReset:'Restore factory settings',
    settingAbout:'About', aboutEngine:'Engine', aboutCompat:'Compatibility',
    footerSync:'Synced across tabs',
    toastEnabled:'✓ All enabled!', toastDisabled:'All disabled',
    toastDefaultsSaved:'✓ Defaults saved', toastDefaultsLoaded:'✓ Defaults loaded',
    toastFactoryDone:'✓ Factory reset done', toastUrlCopied:'✓ URL copied',
    toastOverlayRestored:'✓ Overlay restored', toastAllRestored:'✓ All restored',
    toastScriptSaved:'✓ Script saved', toastScriptDeleted:'Script deleted',
    toastPicker:'🎯 Click an element…', toastPickerDone:'✓ Element hidden',
    toastPickerCancelled:'Pick cancelled', toastCantOpen:'Not available on this page',
    toastNoDefaults:'No defaults saved yet',
    toastIncognito:'Allow incognito in extension settings',
    confirmFactoryTitle:'Factory Reset',
    confirmFactoryMsg:'Delete all scripts and restore factory config?',
    confirmDeleteTitle:'Delete script',
    confirmDeleteMsg:'This action is irreversible.',
    confirmYes:'Confirm', confirmCancel:'Cancel',
    overlayX: n => `${n} overlay${n>1?'s':''} hidden`,
    ago: s => s < 60 ? `${s}s ago` : `${Math.floor(s/60)}min ago`,
  },
  es:{
    active:'Activo', inactive:'Inactivo',
    enableAll:'Activar todo', disableAll:'Desactivar todo',
    picker:'Selec.', cancelPicker:'Cancelar',
    tabProtections:'Protecciones', tabOverlays:'Overlays',
    tabScripts:'Scripts', tabSettings:'Ajustes',
    groupMouse:'Ratón y Selección', groupClipboard:'Portapapeles y Teclado',
    groupBehavior:'Comportamiento', groupAdvanced:'Avanzado', groupTools:'Herramientas',
    fContextmenu:'Clic derecho', dContextmenu:'Reactiva el menú contextual nativo',
    fSelectstart:'Selección de texto', dSelectstart:'Permite resaltar y copiar texto en sitios restrictivos',
    fCursor:'Cursor', dCursor:'Fuerza la visibilidad del cursor',
    fPointerEvents:'Clics en overlays', dPointerEvents:'Hace clicable el contenido bajo popups bloqueantes',
    fClipboard:'Copiar / Cortar / Pegar', dClipboard:'Activa Ctrl+C, Ctrl+X, Ctrl+V en sitios restrictivos',
    fKeyboard:'Atajos de teclado', dKeyboard:'Evita que el sitio bloquee tus atajos',
    fFocus:'Anti-robo de foco', dFocus:'Evita que el sitio mueva automáticamente tu cursor',
    fDragdrop:'Arrastrar y soltar', dDragdrop:'Restaura el drag&drop de imágenes, archivos y enlaces',
    fScroll:'Desplazamiento', dScroll:'Desbloquea el scroll cuando un sitio lo congela',
    fPrint:'Impresión', dPrint:'Permite imprimir o guardar como PDF páginas que lo prohíben',
    fVisibility:'Siempre visible', dVisibility:'Hace creer al sitio que siempre estás en esta pestaña',
    fOverlays:'Eliminar popups auto', dOverlays:'Detecta y oculta automáticamente ventanas bloqueantes',
    fDevtools:'Ocultar dev tools', dDevtools:'Evita que el sitio detecte F12 abierto',
    fConsole:'Proteger consola', dConsole:'Evita que el sitio borre los mensajes de consola',
    experimental:'Experimental',
    toolSource:'Código fuente', toolCopyUrl:'Copiar URL', toolIncognito:'Incógnito',
    overlayNone:'Sin overlays ocultos', restoreAll:'Restaurar todo',
    overlayEmptyMsg:'No hay overlays eliminados.', overlayEmptyHint:'Activa la eliminación auto o usa Selec.',
    overlayAuto:'Auto', overlayManual:'Manual',
    newScript:'Nuevo script', examplesLabel:'Ejemplos:',
    scriptEmptyMsg:'Sin scripts personalizados.', scriptEmptyHint:'Crea scripts JS que se ejecuten en cada página.',
    runAtLabel:'Momento de ejecución:',
    runStart:'Al inicio — antes del contenido',
    runEnd:'DOM listo',
    runIdle:'Carga completa',
    deleteScript:'Eliminar', saveScript:'Guardar',
    settingLanguage:'Idioma / Language', settingTheme:'Apariencia',
    themeDark:'Oscuro', themeLight:'Claro',
    settingDefaults:'Ajustes por defecto',
    settingDefaultsDesc:'Guarda la configuración actual para reaplicarla fácilmente.',
    saveDefaults:'Guardar como defecto', loadDefaults:'Cargar mis valores',
    settingFactory:'Restablecimiento',
    settingFactoryDesc:'Reinicia todo: elimina scripts y restaura ajustes originales.',
    factoryReset:'Restaurar ajustes de fábrica',
    settingAbout:'Acerca de', aboutEngine:'Motor', aboutCompat:'Compatibilidad',
    footerSync:'Sincronizado entre pestañas',
    toastEnabled:'✓ ¡Todo activado!', toastDisabled:'Todo desactivado',
    toastDefaultsSaved:'✓ Valores guardados', toastDefaultsLoaded:'✓ Valores cargados',
    toastFactoryDone:'✓ Restablecido', toastUrlCopied:'✓ URL copiada',
    toastOverlayRestored:'✓ Overlay restaurado', toastAllRestored:'✓ Todo restaurado',
    toastScriptSaved:'✓ Script guardado', toastScriptDeleted:'Script eliminado',
    toastPicker:'🎯 Haz clic en un elemento…', toastPickerDone:'✓ Elemento oculto',
    toastPickerCancelled:'Selección cancelada', toastCantOpen:'No disponible en esta página',
    toastNoDefaults:'Sin valores por defecto',
    toastIncognito:'Permite incógnito en ajustes de extensión',
    confirmFactoryTitle:'Restablecimiento',
    confirmFactoryMsg:'¿Eliminar scripts y restaurar ajustes de fábrica?',
    confirmDeleteTitle:'Eliminar script',
    confirmDeleteMsg:'Esta acción es irreversible.',
    confirmYes:'Confirmar', confirmCancel:'Cancelar',
    overlayX: n => `${n} overlay${n>1?'s':''} oculto${n>1?'s':''}`,
    ago: s => s < 60 ? `hace ${s}s` : `hace ${Math.floor(s/60)}min`,
  },
  de:{
    active:'Aktiv', inactive:'Inaktiv',
    enableAll:'Alle aktivieren', disableAll:'Alle deaktivieren',
    picker:'Auswahl', cancelPicker:'Abbrechen',
    tabProtections:'Schutz', tabOverlays:'Overlays',
    tabScripts:'Skripte', tabSettings:'Einstellungen',
    groupMouse:'Maus & Auswahl', groupClipboard:'Zwischenablage & Tastatur',
    groupBehavior:'Seitenverhalten', groupAdvanced:'Erweitert', groupTools:'Schnelltools',
    fContextmenu:'Rechtsklick', dContextmenu:'Reaktiviert das native Kontextmenü',
    fSelectstart:'Textauswahl', dSelectstart:'Ermöglicht Markieren und Kopieren auf blockierenden Seiten',
    fCursor:'Mauszeiger', dCursor:'Erzwingt die Anzeige des Mauszeigers',
    fPointerEvents:'Klicks auf Overlays', dPointerEvents:'Macht Inhalte unter Popup-Fenstern anklickbar',
    fClipboard:'Kopieren / Ausschneiden / Einfügen', dClipboard:'Aktiviert Strg+C, Strg+X, Strg+V auf blockierenden Seiten',
    fKeyboard:'Tastaturkürzel', dKeyboard:'Verhindert das Abfangen von Kürzeln durch Seiten',
    fFocus:'Anti-Fokusraub', dFocus:'Verhindert automatische Fokusumlenkungen',
    fDragdrop:'Drag & Drop', dDragdrop:'Stellt Drag&Drop für Bilder, Dateien und Links wieder her',
    fScroll:'Scrollen', dScroll:'Entsperrt Scrollen wenn eine Seite es blockiert',
    fPrint:'Drucken', dPrint:'Ermöglicht Drucken oder PDF-Speicherung',
    fVisibility:'Immer sichtbar', dVisibility:'Lässt die Seite glauben Sie seien immer auf diesem Tab',
    fOverlays:'Auto-Overlay-Entfernung', dOverlays:'Erkennt und versteckt automatisch blockierende Fenster',
    fDevtools:'DevTools verbergen', dDevtools:'Verhindert dass die Seite F12 erkennt',
    fConsole:'Konsolenschutz', dConsole:'Verhindert dass die Seite Konsolenmeldungen löscht',
    experimental:'Experimentell',
    toolSource:'Quellcode', toolCopyUrl:'URL kopieren', toolIncognito:'Privat',
    overlayNone:'Keine Overlays ausgeblendet', restoreAll:'Alle wiederherstellen',
    overlayEmptyMsg:'Keine Overlays ausgeblendet.', overlayEmptyHint:'Auto-Entfernung aktivieren oder Auswahl-Button nutzen.',
    overlayAuto:'Auto', overlayManual:'Manuell',
    newScript:'Neues Skript', examplesLabel:'Beispiele:',
    scriptEmptyMsg:'Keine benutzerdefinierten Skripte.', scriptEmptyHint:'Erstelle JS-Skripte die automatisch auf jeder Seite laufen.',
    runAtLabel:'Ausführungszeitpunkt:',
    runStart:'Beim Start — vor dem Seiteninhalt',
    runEnd:'DOM bereit',
    runIdle:'Vollständig geladen',
    deleteScript:'Löschen', saveScript:'Speichern',
    settingLanguage:'Sprache / Language', settingTheme:'Erscheinungsbild',
    themeDark:'Dunkel', themeLight:'Hell',
    settingDefaults:'Standardeinstellungen',
    settingDefaultsDesc:'Aktuelle Konfiguration speichern um sie einfach wiederherzustellen.',
    saveDefaults:'Als Standard speichern', loadDefaults:'Meine Standards laden',
    settingFactory:'Zurücksetzen',
    settingFactoryDesc:'Alles zurücksetzen: löscht Skripte und stellt Originaleinstellungen wieder her.',
    factoryReset:'Werkseinstellungen',
    settingAbout:'Über', aboutEngine:'Engine', aboutCompat:'Kompatibilität',
    footerSync:'Tabs synchronisiert',
    toastEnabled:'✓ Alles aktiviert!', toastDisabled:'Alles deaktiviert',
    toastDefaultsSaved:'✓ Standards gespeichert', toastDefaultsLoaded:'✓ Standards geladen',
    toastFactoryDone:'✓ Zurückgesetzt', toastUrlCopied:'✓ URL kopiert',
    toastOverlayRestored:'✓ Overlay wiederhergestellt', toastAllRestored:'✓ Alle wiederhergestellt',
    toastScriptSaved:'✓ Skript gespeichert', toastScriptDeleted:'Skript gelöscht',
    toastPicker:'🎯 Element anklicken…', toastPickerDone:'✓ Element ausgeblendet',
    toastPickerCancelled:'Auswahl abgebrochen', toastCantOpen:'Auf dieser Seite nicht verfügbar',
    toastNoDefaults:'Noch keine Standards gespeichert',
    toastIncognito:'Inkognito in Erweiterungseinstellungen erlauben',
    confirmFactoryTitle:'Zurücksetzen',
    confirmFactoryMsg:'Alle Skripte löschen und Werkseinstellungen wiederherstellen?',
    confirmDeleteTitle:'Skript löschen',
    confirmDeleteMsg:'Diese Aktion ist nicht rückgängig zu machen.',
    confirmYes:'Bestätigen', confirmCancel:'Abbrechen',
    overlayX: n => `${n} Overlay${n>1?'s':''} ausgeblendet`,
    ago: s => s < 60 ? `vor ${s}s` : `vor ${Math.floor(s/60)}min`,
  },
};

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════
const VERSION = '3.0.0';

const FEATURE_GROUPS = {
  mouse   : ['contextmenu','selectstart','cursor','pointerEvents'],
  keyboard: ['clipboard','keyboard','focus'],
  behavior: ['dragdrop','scroll','print','visibility','overlays'],
  advanced: ['devtools','consoleProtect'],
};

const FACTORY_DEFAULTS = {
  contextmenu:true, selectstart:true, clipboard:true, keyboard:true,
  dragdrop:true, scroll:false, cursor:true, pointerEvents:false,
  print:true, overlays:false, devtools:false, consoleProtect:false,
  focus:false, visibility:true,
};

// ════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════
let cfg      = { ...FACTORY_DEFAULTS, customScripts: [] };
let lang     = 'fr';
let theme    = 'dark';
let tabId    = null;
let pickerOn = false;
let editingScriptId = null;
let toastTimer = null;

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════
function t(key, ...args) {
  const tr = I18N[lang] || I18N.fr;
  const v  = tr[key] ?? I18N.fr[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

// Échappement HTML sécurisé — utilisé partout où du texte est affiché
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Crée un élément texte (safe, pas d'innerHTML)
function setText(el, text) { if (el) el.textContent = String(text); }

function syncing(on) {
  document.getElementById('syncDot')?.classList.toggle('syncing', on);
}

// ════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════
function toast(msg, type = 'ok', ms = 1900) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = String(msg);
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ════════════════════════════════════════════════════════════════
// CONFIRM MODAL (sécurisé : textContent uniquement)
// ════════════════════════════════════════════════════════════════
function showConfirm(titleKey, msgKey) {
  return new Promise(resolve => {
    const bd = document.getElementById('modalBackdrop');
    if (!bd) { resolve(false); return; }
    setText(document.getElementById('confirmTitle'), t(titleKey));
    setText(document.getElementById('confirmMsg'),   t(msgKey));
    setText(document.getElementById('confirmYes'),   t('confirmYes'));
    setText(document.getElementById('confirmNo'),    t('confirmCancel'));
    bd.style.display = 'flex';
    const cleanup = ok => { bd.style.display = 'none'; resolve(ok); };
    document.getElementById('confirmYes').onclick = () => cleanup(true);
    document.getElementById('confirmNo').onclick  = () => cleanup(false);
  });
}

// ════════════════════════════════════════════════════════════════
// SEND TO CONTENT SCRIPT
// ════════════════════════════════════════════════════════════════
async function send(action, extra = {}) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { action, ...extra });
  } catch (_) {
    // Tab introuvable ou content script non injecté (chrome://, about:, etc.)
  }
}

// ════════════════════════════════════════════════════════════════
// APPLY SETTINGS
// ════════════════════════════════════════════════════════════════
async function applySettings(patch) {
  // Valider que patch ne contient que des clés autorisées
  const safe = {};
  const allowed = new Set([...Object.keys(FACTORY_DEFAULTS), 'customScripts']);
  Object.keys(patch).forEach(k => { if (allowed.has(k)) safe[k] = patch[k]; });
  cfg = { ...cfg, ...safe };
  syncing(true);
  await chrome.storage.sync.set({ ...cfg, customScripts: JSON.stringify(cfg.customScripts) });
  await send('updateSettings', { settings: cfg });
  updateUI();
  setTimeout(() => syncing(false), 500);
}

// ════════════════════════════════════════════════════════════════
// i18n APPLICATION
// ════════════════════════════════════════════════════════════════
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  document.querySelectorAll('.theme-pick').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  document.getElementById('iconMoon').style.display = theme === 'dark'  ? '' : 'none';
  document.getElementById('iconSun').style.display  = theme === 'light' ? '' : 'none';
  updatePickerBtn();
}

// ════════════════════════════════════════════════════════════════
// UI UPDATE
// ════════════════════════════════════════════════════════════════
function updateUI() {
  // Toggles
  document.querySelectorAll('input[data-key]').forEach(inp => {
    if (inp.dataset.key in cfg) inp.checked = !!cfg[inp.dataset.key];
  });

  // Compteurs de groupes
  const countMap = { mouse:'cnt-mouse', keyboard:'cnt-keyboard', behavior:'cnt-behavior', advanced:'cnt-advanced' };
  Object.entries(FEATURE_GROUPS).forEach(([g, keys]) => {
    const el = document.getElementById(countMap[g]);
    if (!el) return;
    const active = keys.filter(k => cfg[k]).length;
    el.textContent = `${active}/${keys.length}`;
    el.classList.toggle('all-on', active === keys.length);
  });

  // Status badge
  const anyOn = Object.keys(FACTORY_DEFAULTS).some(k => cfg[k]);
  const badge  = document.getElementById('statusBadge');
  badge?.classList.toggle('inactive', !anyOn);
  const stText = badge?.querySelector('.status-text');
  if (stText) stText.textContent = anyOn ? t('active') : t('inactive');

  // Badge scripts
  const sc = cfg.customScripts?.length || 0;
  const sb = document.getElementById('scriptsBadge');
  if (sb) { sb.style.display = sc > 0 ? '' : 'none'; sb.textContent = sc; }

  renderScriptList();
}

// ════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab, .panel').forEach(el => el.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
}

// ════════════════════════════════════════════════════════════════
// TOGGLES
// ════════════════════════════════════════════════════════════════
function initToggles() {
  document.querySelectorAll('input[data-key]').forEach(inp => {
    inp.addEventListener('change', () => {
      applySettings({ [inp.dataset.key]: inp.checked });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// PICKER
// ════════════════════════════════════════════════════════════════
function updatePickerBtn() {
  const btn = document.getElementById('btnPickOverlay');
  const lbl = document.getElementById('btnPickerLabel');
  if (!btn || !lbl) return;
  if (pickerOn) {
    btn.classList.add('picking');
    lbl.textContent = t('cancelPicker');
  } else {
    btn.classList.remove('picking');
    lbl.textContent = t('picker');
  }
}

// ════════════════════════════════════════════════════════════════
// QUICK ACTIONS
// ════════════════════════════════════════════════════════════════
function initQuickActions() {
  document.getElementById('btnOverpass')?.addEventListener('click', () => {
    const all = {};
    Object.keys(FACTORY_DEFAULTS).forEach(k => all[k] = true);
    applySettings(all);
    toast(t('toastEnabled'));
  });

  document.getElementById('btnLockAll')?.addEventListener('click', () => {
    const none = {};
    Object.keys(FACTORY_DEFAULTS).forEach(k => none[k] = false);
    applySettings(none);
    toast(t('toastDisabled'), 'info');
  });

  document.getElementById('btnPickOverlay')?.addEventListener('click', async () => {
    if (pickerOn) {
      pickerOn = false;
      updatePickerBtn();
      await send('cancelPicker');
      toast(t('toastPickerCancelled'), 'info');
    } else {
      // Vérifier qu'on est sur une page normale (pas chrome://)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || tab.url.startsWith('chrome') || tab.url.startsWith('about')) {
        toast(t('toastCantOpen'), 'err');
        return;
      }
      pickerOn = true;
      updatePickerBtn();
      toast(t('toastPicker'), 'info', 10000);
      await send('activatePicker');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// QUICK TOOLS
// ════════════════════════════════════════════════════════════════
function initTools() {
  document.getElementById('btnViewSource')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && !tab.url.startsWith('chrome') && !tab.url.startsWith('about')) {
      chrome.tabs.create({ url: 'view-source:' + tab.url });
    } else {
      toast(t('toastCantOpen'), 'err');
    }
  });

  document.getElementById('btnCopyUrl')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try { await navigator.clipboard.writeText(tab.url); toast(t('toastUrlCopied')); } catch (_) {}
    }
  });

  document.getElementById('btnIncognito')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    chrome.windows.create({ url: tab.url, incognito: true }, () => {
      if (chrome.runtime.lastError) toast(t('toastIncognito'), 'err', 3000);
    });
  });
}

// ════════════════════════════════════════════════════════════════
// OVERLAY PANEL
// ════════════════════════════════════════════════════════════════
function initOverlayPanel() {
  document.getElementById('btnRestoreAll')?.addEventListener('click', async () => {
    await send('restoreAllOverlays');
    toast(t('toastAllRestored'));
  });
}

function renderOverlayList(list) {
  // Validation : s'assurer que list est un tableau d'objets attendus
  if (!Array.isArray(list)) list = [];
  const safe = list.filter(o => o && typeof o === 'object' && typeof o.id === 'string');

  const cnt   = safe.length;
  const badge = document.getElementById('overlayBadge');
  if (badge) { badge.style.display = cnt > 0 ? '' : 'none'; badge.textContent = cnt; }

  const countEl = document.getElementById('overlayCount');
  if (countEl) countEl.textContent = cnt > 0 ? t('overlayX', cnt) : t('overlayNone');

  const restoreBtn = document.getElementById('btnRestoreAll');
  if (restoreBtn) restoreBtn.style.display = cnt > 0 ? '' : 'none';

  const container = document.getElementById('overlayList');
  const empty     = document.getElementById('overlayEmpty');
  if (!container) return;

  if (cnt === 0) {
    container.innerHTML = '';
    if (empty) container.appendChild(empty);
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  container.innerHTML = '';

  safe.forEach(ov => {
    const ago = Math.floor((Date.now() - (ov.ts || 0)) / 1000);
    const item = document.createElement('div');
    item.className = `overlay-item ${ov.auto ? 'auto-item' : 'manual-item'}`;

    // Icône (SVG statique, pas de données utilisateur)
    const icon = document.createElement('div');
    icon.className = 'overlay-icon';
    icon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

    const info = document.createElement('div');
    info.className = 'overlay-info';
    const desc = document.createElement('div');
    desc.className = 'overlay-desc';
    desc.title = ov.desc || '';
    desc.textContent = ov.desc || '(inconnu)'; // textContent = safe
    const meta = document.createElement('div');
    meta.className = 'overlay-meta';
    meta.textContent = `${ov.auto ? t('overlayAuto') : t('overlayManual')} · ${t('ago', ago)}`;
    info.appendChild(desc);
    info.appendChild(meta);

    const btn = document.createElement('button');
    btn.className = 'restore-btn';
    btn.title = 'Restaurer';
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15a9 9 0 1 0 .49-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    btn.addEventListener('click', async () => {
      await send('restoreOverlay', { id: ov.id });
      toast(t('toastOverlayRestored'));
    });

    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

// ════════════════════════════════════════════════════════════════
// SCRIPT EDITOR
// ════════════════════════════════════════════════════════════════
function renderScriptList() {
  const scripts   = cfg.customScripts || [];
  const container = document.getElementById('scriptList');
  const empty     = document.getElementById('scriptEmpty');
  if (!container) return;

  if (scripts.length === 0) {
    container.innerHTML = '';
    if (empty) { container.appendChild(empty); empty.style.display = ''; }
    return;
  }
  if (empty) empty.style.display = 'none';
  container.innerHTML = '';

  scripts.forEach(sc => {
    const lines = (sc.code || '').split('\n').length;
    const item  = document.createElement('div');
    item.className = 'script-item';

    const icon = document.createElement('div');
    icon.className = 'script-icon';
    icon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="16 18 22 12 16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="8 6 2 12 8 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

    const info = document.createElement('div');
    info.className = 'script-info';
    const name = document.createElement('div');
    name.className = 'script-name';
    name.textContent = sc.name || 'Sans nom'; // textContent = safe
    const meta = document.createElement('div');
    meta.className = 'script-meta';
    meta.textContent = `${sc.runAt || ''} · ${lines} ligne${lines > 1 ? 's' : ''}`;
    info.appendChild(name);
    info.appendChild(meta);

    // Toggle enable/disable
    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'toggle';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = !!sc.enabled;
    inp.addEventListener('change', e => {
      e.stopPropagation();
      const updated = cfg.customScripts.map(s =>
        s.id === sc.id ? { ...s, enabled: inp.checked } : s
      );
      applySettings({ customScripts: updated });
    });
    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'slider';
    toggleWrap.appendChild(inp);
    toggleWrap.appendChild(sliderSpan);

    item.addEventListener('click', e => {
      if (e.target.closest('label')) return;
      openScriptEditor(sc.id);
    });

    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(toggleWrap);
    container.appendChild(item);
  });
}

function openScriptEditor(id = null) {
  editingScriptId = id;
  const sc = id ? cfg.customScripts.find(s => s.id === id) : null;

  const nameEl   = document.getElementById('editorName');
  const codeEl   = document.getElementById('editorCode');
  const runAtEl  = document.getElementById('editorRunAt');
  const delBtn   = document.getElementById('btnDeleteScript');
  const editorEl = document.getElementById('scriptEditor');

  if (nameEl)   nameEl.value   = sc?.name   || '';
  if (codeEl)   codeEl.value   = sc?.code   || '';
  if (runAtEl)  runAtEl.value  = sc?.runAt  || 'document_idle';
  if (delBtn)   delBtn.style.display = id ? '' : 'none';
  if (editorEl) { editorEl.style.display = ''; nameEl?.focus(); }
}

function closeScriptEditor() {
  editingScriptId = null;
  const ed = document.getElementById('scriptEditor');
  if (ed) ed.style.display = 'none';
}

function initScriptEditor() {
  document.getElementById('btnNewScript')?.addEventListener('click', () => openScriptEditor(null));
  document.getElementById('btnCloseEditor')?.addEventListener('click', closeScriptEditor);

  document.getElementById('btnSaveScript')?.addEventListener('click', () => {
    const name  = (document.getElementById('editorName')?.value || '').trim() || 'Script';
    const code  = document.getElementById('editorCode')?.value || '';
    const runAt = document.getElementById('editorRunAt')?.value || 'document_idle';
    if (!code.trim()) { toast('Code vide', 'err'); return; }
    let scripts = [...(cfg.customScripts || [])];
    if (editingScriptId) {
      scripts = scripts.map(s => s.id === editingScriptId ? { ...s, name, code, runAt } : s);
    } else {
      scripts.push({ id: `sc_${Date.now()}`, name, code, runAt, enabled: true });
    }
    applySettings({ customScripts: scripts });
    toast(t('toastScriptSaved'));
    closeScriptEditor();
  });

  document.getElementById('btnDeleteScript')?.addEventListener('click', async () => {
    const ok = await showConfirm('confirmDeleteTitle', 'confirmDeleteMsg');
    if (!ok) return;
    const scripts = (cfg.customScripts || []).filter(s => s.id !== editingScriptId);
    applySettings({ customScripts: scripts });
    toast(t('toastScriptDeleted'), 'info');
    closeScriptEditor();
  });

  // Snippets exemples
  document.querySelectorAll('.tip-btn[data-snippet]').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeEl = document.getElementById('editorCode');
      if (codeEl) { codeEl.value = btn.dataset.snippet; codeEl.focus(); }
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════
function applyTheme(newTheme) {
  theme = newTheme;
  document.body.classList.remove('dark', 'light');
  document.body.classList.add(newTheme);
  document.querySelectorAll('.theme-pick').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === newTheme)
  );
  const moon = document.getElementById('iconMoon');
  const sun  = document.getElementById('iconSun');
  if (moon) moon.style.display = newTheme === 'dark'  ? '' : 'none';
  if (sun)  sun.style.display  = newTheme === 'light' ? '' : 'none';
  chrome.storage.sync.set({ theme: newTheme });
}

function initSettings() {
  // Langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      chrome.storage.sync.set({ language: lang });
      applyI18n();
      updateUI();
    });
  });

  // Thème (boutons dans settings)
  document.getElementById('themePickDark')?.addEventListener('click',  () => applyTheme('dark'));
  document.getElementById('themePickLight')?.addEventListener('click', () => applyTheme('light'));

  // Thème (bouton header)
  document.getElementById('btnTheme')?.addEventListener('click', () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  });

  // Sauvegarder défauts
  document.getElementById('btnSaveDefaults')?.addEventListener('click', async () => {
    const snap = {};
    Object.keys(FACTORY_DEFAULTS).forEach(k => snap[k] = cfg[k]);
    await chrome.storage.sync.set({ userDefaults: JSON.stringify(snap) });
    toast(t('toastDefaultsSaved'));
  });

  // Charger défauts
  document.getElementById('btnLoadDefaults')?.addEventListener('click', async () => {
    const stored = await chrome.storage.sync.get({ userDefaults: null });
    if (!stored.userDefaults) { toast(t('toastNoDefaults'), 'info'); return; }
    try {
      const snap = JSON.parse(stored.userDefaults);
      // Valider le snap avant de l'appliquer
      const safe = {};
      Object.keys(FACTORY_DEFAULTS).forEach(k => { if (k in snap) safe[k] = !!snap[k]; });
      applySettings(safe);
      toast(t('toastDefaultsLoaded'));
    } catch (_) { toast('Erreur de lecture', 'err'); }
  });

  // Reset usine
  document.getElementById('btnFactoryReset')?.addEventListener('click', async () => {
    const ok = await showConfirm('confirmFactoryTitle', 'confirmFactoryMsg');
    if (!ok) return;
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set({ ...FACTORY_DEFAULTS, customScripts: '[]', language: lang, theme });
    cfg = { ...FACTORY_DEFAULTS, customScripts: [] };
    updateUI();
    await send('updateSettings', { settings: cfg });
    toast(t('toastFactoryDone'));
  });

  // Labels version
  const vl = document.getElementById('versionLabel');
  const av = document.getElementById('aboutVersion');
  if (vl) vl.textContent = `v${VERSION}`;
  if (av) av.textContent = VERSION;
}

// ════════════════════════════════════════════════════════════════
// RUNTIME MESSAGES (inject.js → content.js → background → popup)
// Validation : on vérifie action et payload avant tout usage
// ════════════════════════════════════════════════════════════════
function initRuntimeMessages() {
  chrome.runtime.onMessage.addListener(msg => {
    if (!msg || typeof msg !== 'object') return;
    const { action, payload } = msg;

    switch (action) {
      case 'overlayList':
        if (Array.isArray(payload)) renderOverlayList(payload);
        break;

      case 'pickerDone':
        pickerOn = false;
        updatePickerBtn();
        toast(t('toastPickerDone'));
        send('getState');
        break;

      case 'pickerCancelled':
        pickerOn = false;
        updatePickerBtn();
        // Pas de toast ici — le picker a déjà été annulé depuis la page
        break;

      case 'resourceList':
        // Non affiché dans le popup (panel flottant dans la page)
        break;
    }
  });
}

// ════════════════════════════════════════════════════════════════
// LOAD
// ════════════════════════════════════════════════════════════════
async function loadSettings() {
  const stored = await chrome.storage.sync.get({
    ...FACTORY_DEFAULTS,
    customScripts: '[]',
    language: 'fr',
    theme: 'dark',
  });
  lang  = stored.language || 'fr';
  theme = stored.theme    || 'dark';

  let scripts = [];
  try { scripts = JSON.parse(stored.customScripts || '[]'); } catch (_) {}
  cfg = { ...FACTORY_DEFAULTS, ...stored, customScripts: scripts };

  applyTheme(theme);
  applyI18n();
  updateUI();

  // Demander l'état courant (liste overlays, etc.)
  await send('getState');
}

// ════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id || null;

  initTabs();
  initToggles();
  initQuickActions();
  initTools();
  initOverlayPanel();
  initScriptEditor();
  initSettings();
  initRuntimeMessages();
  await loadSettings();

  // Synchronisation cross-fenêtre
  chrome.storage.onChanged.addListener(changes => {
    let needsUpdate = false;
    Object.entries(changes).forEach(([k, { newValue }]) => {
      if (k === 'customScripts') {
        try { cfg.customScripts = JSON.parse(newValue || '[]'); needsUpdate = true; } catch (_) {}
      } else if (k === 'language') {
        lang = newValue; applyI18n();
      } else if (k === 'theme') {
        applyTheme(newValue);
      } else if (k in FACTORY_DEFAULTS) {
        cfg[k] = newValue; needsUpdate = true;
      }
    });
    if (needsUpdate) updateUI();
  });
});
