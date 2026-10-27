/*
 * Aviso del vigilante de escritorio.
 *
 * Ventana propia, pequeña y sin marco. Recibe del proceso main el estado con
 * los elementos detectados y las carpetas disponibles; aquí solo se pinta, se
 * cuenta el tiempo que queda y se devuelve la decisión.
 *
 * El selector de carpeta es propio y no un `<select>`: el desplegable nativo
 * de Windows es claro y rompe por completo el estilo del aviso.
 */

const I18N = {
  en: {
    title_one: 'New item on the desktop',
    title_many: 'New items detected',
    folder: 'Folder',
    ignore: 'Not now',
    accept_one: 'Add to library',
    accept_many: 'Add all',
    close: 'Close',
    all: 'All',
    more: 'See all {count} in the notification center',
  },
  es: {
    title_one: 'Nuevo elemento en el escritorio',
    title_many: 'Elementos nuevos detectados',
    folder: 'Carpeta',
    ignore: 'Ahora no',
    accept_one: 'Añadir a la librería',
    accept_many: 'Añadir todos',
    close: 'Cerrar',
    all: 'Todos',
    more: 'Ver los {count} en el centro de notificaciones',
  },
};

let state = { lang: 'en', seconds: 0, total: 0, items: [], folders: [], defaultFolderId: '' };
let busy = false;
let countdownToken = 0;
let selectedFolderId = '';
let menuOpen = false;

const t = (key, vars) => {
  const table = I18N[state.lang] || I18N.en;
  const text = table[key] || I18N.en[key] || key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? '')) : text;
};

const el = {
  card: document.querySelector('.card'),
  title: document.getElementById('title'),
  countdown: document.getElementById('countdown'),
  meter: document.getElementById('meter'),
  items: document.getElementById('items'),
  moreRow: document.getElementById('more-row'),
  more: document.getElementById('more'),
  folderLabel: document.getElementById('folder-label'),
  folderButton: document.getElementById('folder-button'),
  folderDot: document.getElementById('folder-dot'),
  folderValue: document.getElementById('folder-value'),
  menu: document.getElementById('folder-menu'),
  picker: document.querySelector('.picker'),
  accept: document.getElementById('accept'),
  ignore: document.getElementById('ignore'),
  close: document.getElementById('close'),
};

function shortPath(value) {
  const text = String(value || '');
  if (text.length <= 46) return text;
  return `${text.slice(0, 20)}…${text.slice(-24)}`;
}

/** Opciones del selector: primero el destino sin carpeta, luego las reales. */
function folderOptions() {
  const options = [{ id: state.defaultFolderId, name: t('all'), color: '#64748b' }, ...state.folders];
  const seen = new Set();
  return options.filter((option) => {
    if (!option.id || seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

function menuHeight() {
  return Math.min(220, folderOptions().length * 27 + 8);
}

/**
 * Barra y número que se agotan al mismo ritmo que el temporizador del proceso
 * main. Se anima con `requestAnimationFrame` en vez de CSS para que el número
 * y la barra nunca se desincronicen.
 */
function startCountdown(seconds) {
  const token = ++countdownToken;
  const total = Math.max(1, Number(seconds) || 1);
  const started = performance.now();
  el.meter.style.transform = 'scaleX(1)';
  el.countdown.textContent = `${Math.ceil(total)}s`;

  const step = (now) => {
    if (token !== countdownToken) return;
    const remaining = Math.max(0, total - (now - started) / 1000);
    el.meter.style.transform = `scaleX(${(remaining / total).toFixed(4)})`;
    const label = `${Math.ceil(remaining)}s`;
    if (el.countdown.textContent !== label) el.countdown.textContent = label;
    el.countdown.classList.toggle('urgent', remaining <= 3);
    if (remaining > 0) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderFolder() {
  const options = folderOptions();
  const current = options.find(option => option.id === selectedFolderId) || options[0];
  selectedFolderId = current ? current.id : '';
  el.folderValue.textContent = current ? current.name : '';
  el.folderDot.style.background = (current && current.color) || 'var(--text-dim)';

  el.menu.replaceChildren();
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-option';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(option.id === selectedFolderId));

    const dot = document.createElement('span');
    dot.className = 'picker-option-dot';
    dot.style.background = option.color || '#475569';

    const name = document.createElement('span');
    name.className = 'picker-option-name';
    name.textContent = option.name;

    button.append(dot, name);
    button.addEventListener('click', () => {
      selectedFolderId = option.id;
      closeMenu();
      renderFolder();
    });
    el.menu.append(button);
  }
}

function openMenu() {
  if (menuOpen || busy) return;
  menuOpen = true;
  renderFolder();
  el.menu.hidden = false;
  el.folderButton.setAttribute('aria-expanded', 'true');
  // La ventana crece hacia arriba para que el desplegable quepa entero.
  void window.electronAPI.watcher.resize(menuHeight() + 8);
}

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  el.menu.hidden = true;
  el.folderButton.setAttribute('aria-expanded', 'false');
  void window.electronAPI.watcher.resize(-(menuHeight() + 8));
}

function render() {
  const count = state.items.length;
  el.title.textContent = count === 1 ? t('title_one') : t('title_many');

  el.items.replaceChildren();
  for (const item of state.items) {
    const row = document.createElement('li');
    row.className = 'item';

    const icon = document.createElement('img');
    icon.className = 'item-icon';
    icon.alt = '';
    if (item.iconPath) icon.src = item.iconPath;
    else icon.style.visibility = 'hidden';

    const text = document.createElement('div');
    text.className = 'item-text';

    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;
    name.title = item.name;

    const path = document.createElement('span');
    path.className = 'item-path';
    path.textContent = item.isStore ? 'Microsoft Store' : shortPath(item.path);
    path.title = item.path;

    text.append(name, path);
    row.append(icon, text);
    el.items.append(row);
  }

  // Solo aparece si el lote no cabe entero: el resto espera en el centro.
  const hidden = Math.max(0, (Number(state.total) || count) - count);
  el.moreRow.hidden = hidden === 0;
  if (hidden > 0) el.more.textContent = t('more', { count: Number(state.total) });

  el.folderLabel.textContent = t('folder');
  renderFolder();

  el.ignore.textContent = t('ignore');
  el.accept.textContent = count === 1 ? t('accept_one') : t('accept_many');
  el.close.setAttribute('aria-label', t('close'));
  el.accept.disabled = busy || count === 0;
}

function decide(action) {
  if (busy) return;
  closeMenu();
  busy = true;
  el.accept.disabled = true;
  el.ignore.disabled = true;
  countdownToken += 1;
  if (action === 'accept') {
    void window.electronAPI.watcher.add({
      keys: state.items.map(item => item.key),
      categoryId: selectedFolderId || state.defaultFolderId,
    });
  } else {
    void window.electronAPI.watcher.dismiss();
  }
}

el.accept.addEventListener('click', () => decide('accept'));
el.ignore.addEventListener('click', () => decide('ignore'));
el.close.addEventListener('click', () => decide('ignore'));
el.more.addEventListener('click', () => {
  countdownToken += 1;
  void window.electronAPI.notifications.openCenter();
});

el.folderButton.addEventListener('click', () => {
  if (menuOpen) closeMenu();
  else openMenu();
});

document.addEventListener('mousedown', (event) => {
  if (!menuOpen) return;
  if (el.picker.contains(event.target)) return;
  closeMenu();
});

// Mientras el puntero está encima no corre el reloj: elegir carpeta con el
// aviso cerrándose a media decisión sería una carrera perdida.
el.card.addEventListener('mouseenter', () => {
  countdownToken += 1;
  el.countdown.classList.remove('urgent');
  void window.electronAPI.watcher.hold(true);
});
el.card.addEventListener('mouseleave', () => {
  closeMenu();
  void window.electronAPI.watcher.hold(false);
  startCountdown(state.seconds);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (menuOpen) {
      closeMenu();
      return;
    }
    decide('ignore');
  }
  if (event.key === 'Enter' && !event.shiftKey && !menuOpen) {
    event.preventDefault();
    decide('accept');
  }
});

window.electronAPI.watcher.onPrompt((next) => {
  busy = false;
  el.accept.disabled = false;
  el.ignore.disabled = false;
  closeMenu();
  state = {
    lang: next && next.lang === 'es' ? 'es' : 'en',
    seconds: next && Number.isFinite(next.seconds) ? next.seconds : 0,
    total: next && Number.isFinite(next.total) ? next.total : 0,
    items: Array.isArray(next && next.items) ? next.items : [],
    folders: Array.isArray(next && next.folders) ? next.folders : [],
    defaultFolderId: (next && next.defaultFolderId) || '',
  };
  selectedFolderId = state.defaultFolderId;
  render();
  startCountdown(state.seconds);
});
