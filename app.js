/* Smart Notes — frontend-only
   Added Feature:
   🎤 Voice-to-Text Notes (Web Speech API)
*/

const LS_KEY = 'smart_notes_v1';

const state = {
  notes: [],
  editingIndex: null,
  themeDark: false,
  listening: false,
};

// DOM
const noteTitle = document.getElementById('noteTitle');
const noteTags = document.getElementById('noteTags');
const noteBody = document.getElementById('noteBody');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const notesList = document.getElementById('notesList');
const pinnedList = document.getElementById('pinnedList');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const themeToggle = document.getElementById('themeToggle');

// 🎤 Voice recording button and status
const voiceBtn = document.createElement('button');
voiceBtn.id = 'voiceBtn';
voiceBtn.textContent = '🎤 Voice Note';
voiceBtn.style.background = 'linear-gradient(90deg, #06b6d4, #4f46e5)';
voiceBtn.style.color = 'white';
voiceBtn.style.padding = '10px 14px';
voiceBtn.style.borderRadius = '10px';
voiceBtn.style.fontWeight = '600';
voiceBtn.style.border = 'none';
voiceBtn.style.cursor = 'pointer';
noteBody.parentElement.appendChild(voiceBtn);

const voiceStatus = document.createElement('div');
voiceStatus.id = 'voiceStatus';
voiceStatus.style.fontSize = '0.85rem';
voiceStatus.style.marginTop = '4px';
voiceStatus.style.color = '#06b6d4';
noteBody.parentElement.appendChild(voiceStatus);

// 🗣️ Speech recognition setup
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';

  recognition.onstart = () => {
    state.listening = true;
    voiceStatus.textContent = '🎙️ Listening... Speak now!';
    voiceBtn.textContent = '🛑 Stop';
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    noteBody.value = transcript.trim();
  };

  recognition.onend = () => {
    state.listening = false;
    voiceStatus.textContent = '';
    voiceBtn.textContent = '🎤 Voice Note';
  };
} else {
  voiceBtn.disabled = true;
  voiceBtn.textContent = '🎤 Voice Not Supported';
  voiceBtn.style.opacity = '0.5';
}

// 🎤 Toggle start/stop
voiceBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (state.listening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

// --- Existing Core Logic ---
loadState();
render();

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state.notes = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load notes', e);
    state.notes = [];
  }
  const theme = localStorage.getItem('smart_notes_theme');
  state.themeDark = theme === 'dark';
  applyTheme();
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.notes));
}

function applyTheme() {
  if (state.themeDark) document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  themeToggle.textContent = state.themeDark ? '☀️' : '🌙';
  localStorage.setItem('smart_notes_theme', state.themeDark ? 'dark' : 'light');
}

function nowStr() {
  return new Date().toLocaleString();
}

function parseTags(input) {
  if (!input) return [];
  return input
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((v, i, self) => self.indexOf(v) === i);
}

function collectAllTags() {
  const s = new Set();
  state.notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
  return [...s].sort((a, b) => a.localeCompare(b));
}

function createNote(obj) {
  const note = {
    title: obj.title || 'Untitled',
    body: obj.body || '',
    tags: obj.tags || [],
    pinned: !!obj.pinned,
    createdAt: obj.createdAt || nowStr(),
    updatedAt: obj.updatedAt || nowStr(),
  };
  state.notes.push(note);
  saveState();
  render();
}

function updateNote(index, payload) {
  const note = state.notes[index];
  if (!note) return;
  note.title = payload.title;
  note.body = payload.body;
  note.tags = payload.tags;
  note.updatedAt = nowStr();
  saveState();
  render();
}

function deleteNote(index) {
  if (!confirm('Delete this note?')) return;
  state.notes.splice(index, 1);
  saveState();
  render();
}

function clearAllNotes() {
  if (!confirm('Clear ALL notes? This cannot be undone.')) return;
  state.notes = [];
  saveState();
  render();
}

function togglePin(index) {
  state.notes[index].pinned = !state.notes[index].pinned;
  state.notes[index].updatedAt = nowStr();
  saveState();
  render();
}

function render() {
  populateTagFilter();
  const query = (searchInput.value || '').toLowerCase();
  const filterTag = tagFilter.value;

  const pinned = [];
  const unpinned = [];

  state.notes.forEach((n, idx) => {
    const text = `${n.title} ${n.body}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesTag = !filterTag || (n.tags || []).includes(filterTag);

    if (!(matchesQuery && matchesTag)) return;

    const item = { note: n, idx };
    if (n.pinned) pinned.push(item);
    else unpinned.push(item);
  });

  const sortFn = (a, b) => new Date(b.note.updatedAt) - new Date(a.note.updatedAt);
  pinned.sort(sortFn);
  unpinned.sort(sortFn);

  renderList(pinnedList, pinned);
  renderList(notesList, unpinned);
}

function renderList(container, arr) {
  container.innerHTML = '';
  if (arr.length === 0) {
    const el = document.createElement('div');
    el.className = 'muted';
    el.style.padding = '8px';
    el.textContent = 'No notes';
    container.appendChild(el);
    return;
  }

  arr.forEach((item) => {
    const n = item.note;
    const idx = item.idx;

    const card = document.createElement('div');
    card.className = 'note-card';

    const head = document.createElement('div');
    head.className = 'note-head';
    const title = document.createElement('div');
    title.className = 'note-title';
    title.textContent = n.title;
    const meta = document.createElement('div');
    meta.className = 'note-meta';
    meta.textContent = `Updated: ${n.updatedAt}`;
    head.appendChild(title);
    head.appendChild(meta);

    const body = document.createElement('div');
    body.className = 'note-body';
    body.textContent = n.body;

    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'note-tags';
    (n.tags || []).slice(0, 6).forEach((t) => {
      const tEl = document.createElement('span');
      tEl.className = 'tag';
      tEl.textContent = t;
      tagsWrap.appendChild(tEl);
    });

    const actions = document.createElement('div');
    actions.className = 'note-actions';

    const left = document.createElement('div');
    left.className = 'left';
    const pinBtn = document.createElement('button');
    pinBtn.textContent = n.pinned ? '📌 Unpin' : '📍 Pin';
    pinBtn.onclick = () => togglePin(idx);
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => beginEdit(idx);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'danger';
    delBtn.onclick = () => deleteNote(idx);

    left.appendChild(pinBtn);
    left.appendChild(editBtn);

    const right = document.createElement('div');
    right.className = 'right';
    const created = document.createElement('div');
    created.className = 'muted';
    created.textContent = `Created: ${n.createdAt}`;
    right.appendChild(created);
    right.appendChild(delBtn);

    actions.appendChild(left);
    actions.appendChild(right);

    card.appendChild(head);
    card.appendChild(body);
    if ((n.tags || []).length) card.appendChild(tagsWrap);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

function populateTagFilter() {
  const tags = collectAllTags();
  tagFilter.innerHTML = '<option value="">— All tags —</option>';
  tags.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tagFilter.appendChild(opt);
  });
}

function beginEdit(index) {
  const note = state.notes[index];
  state.editingIndex = index;
  noteTitle.value = note.title;
  noteTags.value = (note.tags || []).join(', ');
  noteBody.value = note.body;
  saveBtn.textContent = 'Update';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

saveBtn.addEventListener('click', () => {
  const title = noteTitle.value.trim();
  const body = noteBody.value.trim();
  const tags = parseTags(noteTags.value);

  if (!title && !body) {
    alert('Please enter a title or note body.');
    return;
  }

  if (state.editingIndex !== null) {
    updateNote(state.editingIndex, { title: title || 'Untitled', body, tags });
    state.editingIndex = null;
    saveBtn.textContent = 'Save';
  } else {
    createNote({ title: title || 'Untitled', body, tags });
  }

  noteTitle.value = '';
  noteTags.value = '';
  noteBody.value = '';
});

clearBtn.addEventListener('click', () => {
  noteTitle.value = '';
  noteTags.value = '';
  noteBody.value = '';
  state.editingIndex = null;
  saveBtn.textContent = 'Save';
});

searchInput.addEventListener('input', () => render());
tagFilter.addEventListener('change', () => render());
clearAllBtn.addEventListener('click', clearAllNotes);

exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(state.notes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart-notes-export.json';
  a.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      state.notes = state.notes.concat(
        imported.map((n) => ({
          title: n.title || 'Untitled',
          body: n.body || '',
          tags: n.tags || [],
          pinned: !!n.pinned,
          createdAt: n.createdAt || nowStr(),
          updatedAt: n.updatedAt || nowStr(),
        }))
      );
      saveState();
      render();
      alert('Import successful');
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(f);
  ev.target.value = '';
});

themeToggle.addEventListener('click', () => {
  state.themeDark = !state.themeDark;
  applyTheme();
});

render();
