'use strict';

const ICONS = {
  window: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="10" y1="4" x2="10" y2="8"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="6" y1="4" x2="6" y2="8"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  recent: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  quit: '<svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
  faq: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  update: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
  appDefault: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
};

function getApi() {
  return window.trayMenu || (window.electronAPI && window.electronAPI.trayMenu) || null;
}

const cardEl = document.getElementById('card');
const headEl = document.getElementById('head');
const headDividerEl = document.getElementById('headDivider');
const groupEl = document.getElementById('group');
const exitDividerEl = document.getElementById('exitDivider');
const exitGroupEl = document.getElementById('exitGroup');

let currentState = {
  version: '1.6.0',
  lang: 'en',
  isVisible: false,
  shortcut: 'Alt+Shift+T',
  recents: [],
};
let currentView = 'main';

const I18N = {
  es: {
    back: 'Volver',
    show: 'Mostrar CyberTray',
    hide: 'Ocultar CyberTray',
    newApp: 'Nuevo acceso...',
    settings: 'Ajustes...',
    statusVisible: 'Panel visible',
    statusHidden: 'Panel oculto',
    recentsTitle: 'Accesos recientes',
    viewAllRecents: 'Ver todos los recientes ({count})',
    noRecents: 'Ningún acceso reciente',
    help: 'Ayuda',
    quit: 'Salir',
    docs: 'Documentación y Wiki',
    faq: 'Preguntas frecuentes',
    changelog: 'Registro de cambios',
    website: 'Sitio web oficial',
    donate: 'Donar',
    about: 'Acerca de CyberTray...',
    updates: 'Buscar actualizaciones...',
  },
  en: {
    back: 'Back',
    show: 'Show CyberTray',
    hide: 'Hide CyberTray',
    newApp: 'New shortcut...',
    settings: 'Settings...',
    statusVisible: 'Shelf visible',
    statusHidden: 'Shelf hidden',
    recentsTitle: 'Recent Shortcuts',
    viewAllRecents: 'View all recent ({count})',
    noRecents: 'No recent shortcuts',
    help: 'Help',
    quit: 'Exit',
    docs: 'Documentation & Wiki',
    faq: 'Frequently Asked Questions',
    changelog: 'Changelog',
    website: 'Official Website',
    donate: 'Donate',
    about: 'About CyberTray...',
    updates: 'Check for updates...',
  },
};

function t(key, vars = {}) {
  const lang = (currentState && currentState.lang === 'es') ? 'es' : 'en';
  let text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, String(v));
  }
  return text;
}

function makeSeparator() {
  const sep = document.createElement('div');
  sep.className = 'submenu-divider';
  sep.setAttribute('role', 'separator');
  return sep;
}

function makeItem(def) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'item' + (def.danger ? ' item-danger' : '');
  if (def.title) btn.title = def.title;

  if (def.img) {
    const img = document.createElement('img');
    img.className = 'item-img';
    img.src = def.img;
    img.alt = '';
    img.draggable = false;
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallbackIco = document.createElement('span');
      fallbackIco.className = 'item-ico';
      fallbackIco.innerHTML = ICONS.clock;
      btn.prepend(fallbackIco);
    }, { once: true });
    btn.appendChild(img);
  } else if (def.icon) {
    const ico = document.createElement('span');
    ico.className = 'item-ico';
    ico.innerHTML = ICONS[def.icon] || ICONS.appDefault;
    btn.appendChild(ico);
  }

  const lbl = document.createElement('span');
  lbl.className = 'item-label';
  lbl.textContent = def.label;
  btn.appendChild(lbl);

  if (def.shortcut) {
    const sc = document.createElement('span');
    sc.className = 'item-shortcut';
    sc.textContent = def.shortcut;
    btn.appendChild(sc);
  }

  if (def.trailingIcon) {
    const ch = document.createElement('span');
    ch.className = 'item-chevron';
    ch.innerHTML = ICONS[def.trailingIcon] || ICONS.chevron;
    btn.appendChild(ch);
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (def.localAction) {
      currentView = def.localAction;
      renderView();
    } else if (def.action) {
      const api = getApi();
      if (api && api.action) {
        api.action(def.action, def.payload);
      }
    }
  });

  return btn;
}

function renderHead() {
  headEl.replaceChildren();

  if (currentView === 'main') {
    headDividerEl.style.display = 'block';
    const version = (currentState && currentState.version) || '1.6.0';
    headEl.className = 'head';
    headEl.setAttribute('role', 'button');
    headEl.setAttribute('tabindex', '0');

    const logo = document.createElement('img');
    logo.className = 'head-logo';
    logo.src = '../icon.png';
    logo.alt = '';
    logo.draggable = false;

    const titleWrap = document.createElement('span');
    titleWrap.className = 'head-title';
    titleWrap.innerHTML = `Cyber<span class="head-title-accent">Tray</span> <span class="head-ver">v${version}</span>`;

    headEl.appendChild(logo);
    headEl.appendChild(titleWrap);
    headEl.title = t('about');
    headEl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const api = getApi();
      if (api && api.action) api.action('about');
    };
    headEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const api = getApi();
        if (api && api.action) api.action('about');
      }
    };
  } else {
    headDividerEl.style.display = 'block';
    headEl.className = 'sub-head';
    headEl.title = '';
    headEl.onclick = null;
    headEl.onkeydown = null;
    headEl.removeAttribute('role');
    headEl.removeAttribute('tabindex');

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'back-btn';
    backBtn.innerHTML = `${ICONS.chevronLeft}<span>${t('back')}</span>`;
    backBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentView = 'main';
      renderView();
    };

    headEl.appendChild(backBtn);

    const title = document.createElement('span');
    title.className = 'sub-title';
    title.textContent = currentView === 'help' ? t('help') : t('recentsTitle');
    headEl.appendChild(title);
  }
}

function recentItem(r, label, shortcut) {
  return makeItem({
    action: 'recent',
    payload: r.index,
    img: r.icon || undefined,
    icon: r.icon ? undefined : 'clock',
    label,
    shortcut: shortcut || undefined,
    title: r.path || undefined,
  });
}

function renderMainView() {
  const isVis = Boolean(currentState && currentState.isVisible);
  // Un atajo vacío es una elección del usuario (atajo desactivado): no debe
  // mostrarse el valor de fábrica. Solo se usa el fallback si el estado no
  // trae el campo.
  const shortcut = currentState && typeof currentState.shortcut === 'string'
    ? currentState.shortcut
    : 'Alt+Shift+T';
  const recents = (currentState && Array.isArray(currentState.recents)) ? currentState.recents : [];

  const items = [];

  const statusRow = document.createElement('div');
  statusRow.className = 'status-row';
  statusRow.innerHTML = `
    <span class="status-dot ${isVis ? 'active' : 'idle'}" aria-hidden="true"></span>
    <span class="status-text">${isVis ? t('statusVisible') : t('statusHidden')}</span>
  `;
  items.push(statusRow);

  items.push(
    makeItem({
      action: 'toggle',
      icon: 'window',
      label: isVis ? t('hide') : t('show'),
      shortcut: shortcut || undefined,
    })
  );

  items.push(
    makeItem({
      action: 'new-shortcut',
      icon: 'plus',
      label: t('newApp'),
    })
  );

  items.push(
    makeItem({
      action: 'settings',
      icon: 'settings',
      label: t('settings'),
    })
  );

  items.push(makeSeparator());

  const labelRow = document.createElement('div');
  labelRow.className = 'section-label';
  labelRow.textContent = t('recentsTitle');
  items.push(labelRow);

  if (recents.length > 0) {
    for (const r of recents.slice(0, 4)) {
      items.push(recentItem(r, r.name));
    }
    if (recents.length > 4) {
      items.push(
        makeItem({
          localAction: 'recents',
          icon: 'recent',
          label: t('viewAllRecents', { count: Math.min(recents.length, 10) }),
          trailingIcon: 'chevron',
        })
      );
    }
  } else {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'item item-empty';
    emptyRow.innerHTML = `<span class="item-ico">${ICONS.clock}</span><span class="item-label item-empty-label">${t('noRecents')}</span>`;
    items.push(emptyRow);
  }

  items.push(makeSeparator());
  items.push(
    makeItem({
      localAction: 'help',
      icon: 'help',
      label: t('help'),
      trailingIcon: 'chevron',
    })
  );

  groupEl.replaceChildren(...items);

  exitDividerEl.style.display = 'block';
  exitGroupEl.style.display = 'flex';
  exitGroupEl.replaceChildren(
    makeItem({
      action: 'quit',
      icon: 'quit',
      label: t('quit'),
      danger: true,
    })
  );
}

function renderHelpView() {
  groupEl.replaceChildren(
    makeItem({ action: 'help-docs', icon: 'book', label: t('docs') }),
    makeSeparator(),
    makeItem({ action: 'help-faq', icon: 'faq', label: t('faq') }),
    makeItem({ action: 'help-changelog', icon: 'tag', label: t('changelog') }),
    makeItem({ action: 'help-website', icon: 'globe', label: t('website') }),
    makeItem({ action: 'help-donate', icon: 'heart', label: t('donate') }),
    makeSeparator(),
    makeItem({ action: 'about', icon: 'about', label: t('about') }),
    makeItem({ action: 'check-updates', icon: 'update', label: t('updates') })
  );

  exitDividerEl.style.display = 'none';
  exitGroupEl.style.display = 'none';
}

function renderRecentsView() {
  const recents = ((currentState && Array.isArray(currentState.recents)) ? currentState.recents : []).slice(0, 10);
  if (recents.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'item item-empty';
    emptyRow.innerHTML = `<span class="item-ico">${ICONS.clock}</span><span class="item-label item-empty-label">${t('noRecents')}</span>`;
    groupEl.replaceChildren(emptyRow);
  } else {
    const items = recents.map((r, i) => {
      const num = i + 1;
      return recentItem(r, `${num}. ${r.name}`);
    });
    groupEl.replaceChildren(...items);
  }
  exitDividerEl.style.display = 'none';
  exitGroupEl.style.display = 'none';
}

function renderView() {
  renderHead();
  groupEl.className = 'group';

  if (currentView === 'help') {
    renderHelpView();
  } else if (currentView === 'recents') {
    renderRecentsView();
  } else {
    renderMainView();
  }

  reportSize();
}

function reportSize() {
  if (!cardEl) return;
  requestAnimationFrame(() => {
    const pad = 24;
    let contentH = 0;
    const parts = [headEl, headDividerEl, groupEl, exitDividerEl, exitGroupEl];
    for (const el of parts) {
      if (el && el.style.display !== 'none') {
        contentH += el.getBoundingClientRect().height;
      }
    }
    const cardH = Math.max(cardEl.scrollHeight, Math.ceil(contentH + 2));
    const h = Math.ceil(cardH + 2 * pad);
    const w = Math.ceil(cardEl.offsetWidth + 2 * pad);
    const api = getApi();
    if (api && api.ready && w > 0 && h > 0) {
      api.ready({ width: w, height: h, view: currentView });
    }
  });
}

function applyState(state) {
  currentState = state || currentState;
  if (state && state.resetView) currentView = 'main';
  renderView();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (currentView !== 'main') {
      currentView = 'main';
      renderView();
    } else {
      const api = getApi();
      if (api && api.hide) api.hide();
    }
  }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

const api = getApi();
if (api) {
  if (api.onState) api.onState(applyState);
  if (api.onShow) {
    api.onShow(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => reportSize()));
    });
  }
  if (api.onReset) {
    api.onReset(() => {
      currentView = 'main';
      renderView();
    });
  }
}

renderView();
