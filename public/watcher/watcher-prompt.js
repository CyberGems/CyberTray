/*
 * Aviso del vigilante de escritorio.
 *
 * Ventana propia, pequeña y sin marco. Recibe del proceso main el estado con
 * los elementos detectados y las carpetas disponibles; aquí solo se pinta y se
 * devuelve la decisión.
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
    added: 'Added to the library',
    empty: 'Nothing to add',
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
    added: 'Añadido a la librería',
    empty: 'Nada que añadir',
  },
};

let state = { lang: 'en', items: [], folders: [], defaultFolderId: '' };
let busy = false;

const t = (key) => {
  const table = I18N[state.lang] || I18N.en;
  return table[key] || I18N.en[key] || key;
};

const el = {
  title: document.getElementById('title'),
  items: document.getElementById('items'),
  folder: document.getElementById('folder'),
  folderLabel: document.querySelector('.folder-label'),
  accept: document.getElementById('accept'),
  ignore: document.getElementById('ignore'),
  close: document.getElementById('close'),
};

function shortPath(value) {
  const text = String(value || '');
  if (text.length <= 46) return text;
  return `${text.slice(0, 20)}…${text.slice(-24)}`;
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

  el.folderLabel.textContent = t('folder');
  el.folder.replaceChildren();
  const options = [{ id: state.defaultFolderId, name: t('all') }, ...state.folders];
  const seen = new Set();
  for (const option of options) {
    if (!option.id || seen.has(option.id)) continue;
    seen.add(option.id);
    const node = document.createElement('option');
    node.value = option.id;
    node.textContent = option.name;
    el.folder.append(node);
  }
  el.folder.value = state.defaultFolderId;

  el.ignore.textContent = t('ignore');
  el.accept.textContent = count === 1 ? t('accept_one') : t('accept_many');
  el.close.setAttribute('aria-label', t('close'));
  el.accept.disabled = busy || count === 0;
}

function decide(action) {
  if (busy) return;
  busy = true;
  el.accept.disabled = true;
  el.ignore.disabled = true;
  if (action === 'accept') {
    void window.electronAPI.watcher.add({
      keys: state.items.map(item => item.key),
      categoryId: el.folder.value || state.defaultFolderId,
    });
  } else {
    void window.electronAPI.watcher.dismiss();
  }
}

el.accept.addEventListener('click', () => decide('accept'));
el.ignore.addEventListener('click', () => decide('ignore'));
el.close.addEventListener('click', () => decide('ignore'));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    decide('ignore');
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    decide('accept');
  }
});

window.electronAPI.watcher.onPrompt((next) => {
  busy = false;
  el.accept.disabled = false;
  el.ignore.disabled = false;
  state = {
    lang: next && next.lang === 'es' ? 'es' : 'en',
    items: Array.isArray(next && next.items) ? next.items : [],
    folders: Array.isArray(next && next.folders) ? next.folders : [],
    defaultFolderId: (next && next.defaultFolderId) || '',
  };
  render();
});
