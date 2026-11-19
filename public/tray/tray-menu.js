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
  diamond: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M9 3l3 6 3-6"/></svg>',
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

const stageEl = document.getElementById('stage');
const cardEl = document.getElementById('card');
const headEl = document.getElementById('head');
const headDividerEl = document.getElementById('headDivider');
const groupEl = document.getElementById('group');
const exitDividerEl = document.getElementById('exitDivider');
const exitGroupEl = document.getElementById('exitGroup');
const flyoutRecentsEl = document.getElementById('flyoutRecents');
const flyoutHelpEl = document.getElementById('flyoutHelp');

let currentState = {
  version: '1.9.0',
  lang: 'en',
  isVisible: false,
  shortcut: 'Alt+Shift+T',
  recents: [],
  flyoutSide: 'left',
  verticalAlign: 'bottom',
};
let activeFlyout = null;
let flyoutOpenTimer = null;
let flyoutCloseTimer = null;

function cancelFlyoutTimers() {
  if (flyoutOpenTimer) {
    clearTimeout(flyoutOpenTimer);
    flyoutOpenTimer = null;
  }
  if (flyoutCloseTimer) {
    clearTimeout(flyoutCloseTimer);
    flyoutCloseTimer = null;
  }
}

function getFlyoutElement(target) {
  if (target === 'recents') return flyoutRecentsEl;
  if (target === 'help') return flyoutHelpEl;
  return null;
}

function setActiveFlyout(target) {
  activeFlyout = target;
  const flyouts = [
    ['recents', flyoutRecentsEl],
    ['help', flyoutHelpEl],
  ];
  for (const [id, el] of flyouts) {
    if (!el) continue;
    const isOpen = id === activeFlyout;
    el.classList.toggle('is-open', isOpen);
    el.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
  if (cardEl) {
    const triggers = cardEl.querySelectorAll('[data-flyout-trigger]');
    for (const btn of triggers) {
      const isOpen = btn.dataset.flyoutTrigger === activeFlyout;
      btn.classList.toggle('is-flyout-open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }
}

function scheduleFlyoutOpen(target) {
  cancelFlyoutTimers();
  if (activeFlyout === target) return;
  const delay = activeFlyout !== null ? 60 : 120;
  flyoutOpenTimer = setTimeout(() => {
    flyoutOpenTimer = null;
    setActiveFlyout(target);
  }, delay);
}

function scheduleFlyoutClose() {
  cancelFlyoutTimers();
  if (activeFlyout === null) return;
  flyoutCloseTimer = setTimeout(() => {
    flyoutCloseTimer = null;
    setActiveFlyout(null);
  }, 220);
}

function openFlyoutAndFocusFirst(target) {
  cancelFlyoutTimers();
  setActiveFlyout(target);
  requestAnimationFrame(() => {
    const el = getFlyoutElement(target);
    if (!el) return;
    const firstBtn = el.querySelector('button.item:not(.item-empty)');
    if (firstBtn) firstBtn.focus();
  });
}

function closeFlyoutAndReturnFocus() {
  const prev = activeFlyout;
  cancelFlyoutTimers();
  setActiveFlyout(null);
  if (prev && cardEl) {
    const trigger = cardEl.querySelector(`[data-flyout-trigger="${prev}"]`);
    if (trigger) trigger.focus();
  }
}

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
  btn.setAttribute('role', 'menuitem');
  btn.className = 'item' + (def.danger ? ' item-danger' : '') + (def.donate ? ' item-donate' : '');
  // App-style bubble via [data-tooltip]; a native title would use the OS style.
  if (def.title) btn.dataset.tooltip = def.title;

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

  if (def.localAction) {
    btn.dataset.flyoutTrigger = def.localAction;
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', activeFlyout === def.localAction ? 'true' : 'false');
    if (activeFlyout === def.localAction) {
      btn.classList.add('is-flyout-open');
    }
    btn.addEventListener('mouseenter', () => {
      scheduleFlyoutOpen(def.localAction);
    });
  } else if (def.inMainCard) {
    btn.addEventListener('mouseenter', () => {
      scheduleFlyoutClose();
    });
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (def.localAction) {
      cancelFlyoutTimers();
      setActiveFlyout(activeFlyout === def.localAction ? null : def.localAction);
    } else if (def.action) {
      cancelFlyoutTimers();
      setActiveFlyout(null);
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
  headDividerEl.style.display = 'block';
  const version = (currentState && currentState.version) || '1.9.0';
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
  headEl.dataset.tooltip = t('about');
  headEl.onmouseenter = () => {
    scheduleFlyoutClose();
  };
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
}

function makeFlyoutHead(iconKey, titleText) {
  const head = document.createElement('div');
  head.className = 'flyout-head';

  const title = document.createElement('span');
  title.className = 'flyout-head-title';
  const ico = document.createElement('span');
  ico.className = 'flyout-head-ico';
  ico.innerHTML = ICONS[iconKey] || ICONS.help;
  const text = document.createElement('span');
  text.textContent = titleText;
  title.appendChild(ico);
  title.appendChild(text);
  head.appendChild(title);
  return head;
}

function makeFlyoutDivider() {
  const div = document.createElement('div');
  div.className = 'divider';
  return div;
}

function recentItem(r, label, shortcut, inMainCard = false) {
  return makeItem({
    action: 'recent',
    payload: r.index,
    img: r.icon || undefined,
    icon: r.icon ? undefined : 'clock',
    label,
    shortcut: shortcut || undefined,
    title: r.title || r.path || undefined,
    inMainCard,
  });
}

function renderMainView() {
  const isVis = Boolean(currentState && currentState.isVisible);
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
  statusRow.addEventListener('mouseenter', () => scheduleFlyoutClose());
  items.push(statusRow);

  items.push(
    makeItem({
      action: 'toggle',
      icon: 'window',
      label: isVis ? t('hide') : t('show'),
      shortcut: shortcut || undefined,
      inMainCard: true,
    })
  );

  items.push(
    makeItem({
      action: 'new-shortcut',
      icon: 'plus',
      label: t('newApp'),
      inMainCard: true,
    })
  );

  items.push(
    makeItem({
      action: 'settings',
      icon: 'settings',
      label: t('settings'),
      inMainCard: true,
    })
  );

  items.push(makeSeparator());

  const labelRow = document.createElement('div');
  labelRow.className = 'section-label';
  labelRow.textContent = t('recentsTitle');
  items.push(labelRow);

  if (recents.length > 0) {
    for (const r of recents.slice(0, 4)) {
      items.push(recentItem(r, r.name, undefined, true));
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
      inMainCard: true,
    })
  );
}

function renderHelpFlyout() {
  if (!flyoutHelpEl) return;
  const group = document.createElement('div');
  group.className = 'group group-bottom';
  group.replaceChildren(
    makeItem({ action: 'help-docs', icon: 'book', label: t('docs') }),
    makeSeparator(),
    makeItem({ action: 'help-faq', icon: 'faq', label: t('faq') }),
    makeItem({ action: 'help-changelog', icon: 'tag', label: t('changelog') }),
    makeItem({ action: 'help-website', icon: 'diamond', label: t('website') }),
    makeItem({ action: 'help-donate', icon: 'heart', label: t('donate'), donate: true }),
    makeSeparator(),
    makeItem({ action: 'about', icon: 'about', label: t('about') }),
    makeItem({ action: 'check-updates', icon: 'update', label: t('updates') })
  );
  flyoutHelpEl.replaceChildren(
    makeFlyoutHead('help', t('help')),
    makeFlyoutDivider(),
    group
  );
}

function renderRecentsFlyout() {
  if (!flyoutRecentsEl) return;
  const recents = ((currentState && Array.isArray(currentState.recents)) ? currentState.recents : []).slice(0, 10);
  const group = document.createElement('div');
  group.className = 'group group-bottom';

  if (recents.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'item item-empty';
    emptyRow.innerHTML = `<span class="item-ico">${ICONS.clock}</span><span class="item-label item-empty-label">${t('noRecents')}</span>`;
    group.replaceChildren(emptyRow);
  } else {
    const items = recents.map((r, i) => {
      const num = i + 1;
      const shortcutKey = num === 10 ? '0' : String(num);
      return recentItem(r, `${num}. ${r.name}`, shortcutKey);
    });
    group.replaceChildren(...items);
  }

  flyoutRecentsEl.replaceChildren(
    makeFlyoutHead('recent', t('recentsTitle')),
    makeFlyoutDivider(),
    group
  );
}

function renderView(prepared = false) {
  if (stageEl) {
    stageEl.dataset.flyoutSide = currentState?.flyoutSide === 'right' ? 'right' : 'left';
    stageEl.dataset.verticalAlign = currentState?.verticalAlign === 'top' ? 'top' : 'bottom';
  }

  renderHead();
  groupEl.className = 'group';
  renderMainView();
  renderRecentsFlyout();
  renderHelpFlyout();

  const recents = (currentState && Array.isArray(currentState.recents)) ? currentState.recents : [];
  if (activeFlyout === 'recents' && recents.length <= 4) {
    activeFlyout = null;
  }
  setActiveFlyout(activeFlyout);

  reportSize(prepared);
}

function measureCardHeight(el) {
  if (!el) return 0;
  return Math.max(el.scrollHeight, Math.ceil(el.getBoundingClientRect().height));
}

let revealRaf = null;

function cancelPendingReveal() {
  if (revealRaf !== null) { cancelAnimationFrame(revealRaf); revealRaf = null; }
}

function sendMeasuredSize(prepared) {
  if (!cardEl) return;
  if (stageEl) void stageEl.offsetWidth;
  const pad = 24;
  const recents = (currentState && Array.isArray(currentState.recents)) ? currentState.recents : [];
  const cardH = Math.max(
    measureCardHeight(cardEl),
    measureCardHeight(flyoutHelpEl),
    recents.length > 4 ? measureCardHeight(flyoutRecentsEl) : 0
  );
  const h = Math.ceil(cardH + 2 * pad);
  const w = Math.ceil(cardEl.offsetWidth + 2 * pad);
  const api = getApi();
  if (api && api.ready && w > 0 && h > 0) {
    api.ready({ width: w, height: h, view: 'main', prepared: Boolean(prepared) });
  }
}

function reportSize(prepared) {
  sendMeasuredSize(prepared);
}

function applyState(state) {
  currentState = state || currentState;
  if (state && state.resetView) {
    cancelFlyoutTimers();
    activeFlyout = null;
  }
  renderView(Boolean(state && state.prepareReveal));
}

if (cardEl) {
  cardEl.addEventListener('mouseleave', () => {
    scheduleFlyoutClose();
  });
}

for (const flyoutEl of [flyoutRecentsEl, flyoutHelpEl]) {
  if (!flyoutEl) continue;
  flyoutEl.addEventListener('mouseenter', () => {
    cancelFlyoutTimers();
  });
  flyoutEl.addEventListener('mouseleave', () => {
    scheduleFlyoutClose();
  });
}

document.addEventListener('mousedown', (e) => {
  const target = e.target;
  if (!(target instanceof Node)) return;
  if (cardEl && cardEl.contains(target)) return;
  const openFlyout = getFlyoutElement(activeFlyout);
  if (openFlyout && openFlyout.contains(target)) return;
  cancelFlyoutTimers();
  setActiveFlyout(null);
  const api = getApi();
  if (api && api.hide) api.hide();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (activeFlyout !== null) {
      closeFlyoutAndReturnFocus();
    } else {
      const api = getApi();
      if (api && api.hide) api.hide();
    }
    return;
  }

  const flyoutSide = currentState?.flyoutSide === 'right' ? 'right' : 'left';
  const openKey = flyoutSide === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const closeKey = flyoutSide === 'left' ? 'ArrowRight' : 'ArrowLeft';
  const openFlyoutEl = getFlyoutElement(activeFlyout);
  const activeEl = document.activeElement;
  const inFlyout = Boolean(openFlyoutEl && activeEl && openFlyoutEl.contains(activeEl));

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const scope = (inFlyout && openFlyoutEl) ? openFlyoutEl : cardEl;
    if (!scope) return;
    const buttons = Array.from(scope.querySelectorAll('button.item:not(.item-empty)'));
    if (buttons.length === 0) return;
    e.preventDefault();
    const idx = buttons.indexOf(activeEl);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const nextIdx = idx === -1
      ? (delta > 0 ? 0 : buttons.length - 1)
      : (idx + delta + buttons.length) % buttons.length;
    buttons[nextIdx]?.focus();
    return;
  }

  if (e.key === openKey || (!inFlyout && e.key === closeKey)) {
    const triggerTarget = activeEl && activeEl.dataset ? activeEl.dataset.flyoutTrigger : null;
    if (!inFlyout && triggerTarget) {
      e.preventDefault();
      openFlyoutAndFocusFirst(triggerTarget);
      return;
    }
  }

  if (e.key === closeKey && activeFlyout !== null) {
    e.preventDefault();
    closeFlyoutAndReturnFocus();
    return;
  }

  if (activeFlyout === 'recents') {
    const recents = ((currentState && Array.isArray(currentState.recents)) ? currentState.recents : []).slice(0, 10);
    let idx = -1;
    if (e.key >= '1' && e.key <= '9') idx = parseInt(e.key, 10) - 1;
    else if (e.key === '0') idx = 9;
    if (idx >= 0 && idx < recents.length) {
      e.preventDefault();
      const api = getApi();
      if (api && api.action) api.action('recent', recents[idx].index);
    }
  }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

const api = getApi();
if (api) {
  if (api.onState) api.onState(applyState);
  if (api.onShow) {
    api.onShow(() => {
      cancelPendingReveal();
      revealRaf = requestAnimationFrame(() => {
        revealRaf = null;
        if (stageEl) stageEl.classList.remove('is-offscreen');
      });
    });
  }
  if (api.onReset) {
    api.onReset(() => {
      cancelPendingReveal();
      cancelFlyoutTimers();
      setActiveFlyout(null);
    });
  }
}
