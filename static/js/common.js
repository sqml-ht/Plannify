/* Plannify shared helpers: task storage (localStorage for now), formatting, toasts, sidebar. */
(function () {
  'use strict';

  var KEY = 'plannify.tasks';
  var PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  var PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

  /* ---------- date / text helpers ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function todayISO() { return iso(new Date()); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(t) {
    if (!t) return '';
    var p = t.split(':').map(Number);
    return ((p[0] % 12) || 12) + ':' + pad(p[1]) + ' ' + (p[0] >= 12 ? 'PM' : 'AM');
  }

  function fmtDate(s, opts) {
    return parseISO(s).toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function relDate(s) {
    var diff = Math.round((parseISO(s) - parseISO(todayISO())) / 864e5);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return fmtDate(s);
  }

  /* ---------- task storage ---------- */
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    changed();
  }

  function changed() {
    updateBadge();
    document.dispatchEvent(new CustomEvent('plannify:tasks'));
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function clean(t) {
    return {
      name: String(t.name || '').trim(),
      date: t.date,
      time: t.time || '',
      priority: PRIORITY_RANK[t.priority] !== undefined ? t.priority : 'medium'
    };
  }

  function getTasks() { return load(); }
  function getTask(id) { return load().filter(function (t) { return t.id === id; })[0]; }

  function addTask(data) {
    var list = load();
    var t = Object.assign({ id: uid(), completed: false, createdAt: Date.now() }, clean(data));
    list.push(t);
    persist(list);
    return t;
  }

  function addMany(items) {
    var list = load();
    items.forEach(function (d) {
      list.push(Object.assign({ id: uid(), completed: !!d.completed, createdAt: Date.now() }, clean(d)));
    });
    persist(list);
  }

  function updateTask(id, patch) {
    var list = load().map(function (t) {
      if (t.id !== id) return t;
      var next = Object.assign({}, t, clean(Object.assign({}, t, patch)));
      if (patch.completed !== undefined) next.completed = !!patch.completed;
      return next;
    });
    persist(list);
  }

  function toggleTask(id) {
    var t = getTask(id);
    if (t) updateTask(id, { completed: !t.completed });
  }

  function removeTask(id) {
    persist(load().filter(function (t) { return t.id !== id; }));
  }

  function clearAll() { persist([]); }

  /* ---------- ordering / status ---------- */
  function compare(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    var ta = a.time || '24:00', tb = b.time || '24:00';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  }

  function isOverdue(t) {
    if (t.completed) return false;
    var d = parseISO(t.date), now = new Date();
    if (t.time) {
      var p = t.time.split(':').map(Number);
      d.setHours(p[0], p[1], 0, 0);
      return d < now;
    }
    return t.date < todayISO();
  }

  /* ---------- UI helpers ---------- */
  function toast(msg) {
    var wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2200);
    setTimeout(function () { el.remove(); }, 2600);
  }

  function updateBadge() {
    var n = load().filter(function (t) { return !t.completed; }).length;
    document.querySelectorAll('[data-pending-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  function mi(name) { return '<span class="material-symbols-rounded" aria-hidden="true">' + name + '</span>'; }
  var icons = {
    edit: mi('edit'),
    trash: mi('delete'),
    check: mi('check'),
    cal: mi('event'),
    clock: mi('schedule')
  };

  function initShell() {
    var sidebar = document.getElementById('sidebar');
    var scrim = document.getElementById('scrim');
    var btn = document.getElementById('menuBtn');

    function setOpen(open) {
      if (!sidebar) return;
      sidebar.classList.toggle('open', open);
      if (scrim) scrim.classList.toggle('show', open);
    }
    if (btn) btn.addEventListener('click', function () { setOpen(!sidebar.classList.contains('open')); });
    if (scrim) scrim.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

    var sd = document.getElementById('sideDate');
    if (sd) sd.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    updateBadge();
  }

  window.addEventListener('storage', function (e) { if (e.key === KEY) changed(); });
  document.addEventListener('DOMContentLoaded', initShell);

  window.Plannify = {
    iso: iso, parseISO: parseISO, todayISO: todayISO, esc: esc,
    fmtTime: fmtTime, fmtDate: fmtDate, relDate: relDate,
    getTasks: getTasks, getTask: getTask, addTask: addTask, addMany: addMany,
    updateTask: updateTask, toggleTask: toggleTask, removeTask: removeTask, clearAll: clearAll,
    compare: compare, isOverdue: isOverdue,
    toast: toast, icons: icons, PRIORITY_RANK: PRIORITY_RANK, PRIORITY_LABEL: PRIORITY_LABEL
  };
})();
