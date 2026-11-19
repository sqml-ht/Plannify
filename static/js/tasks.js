/* To-Do List page */
(function () {
  'use strict';

  var P = window.Plannify;
  var state = { filter: 'all', q: '', sort: 'due' };

  var pendingList = document.getElementById('pendingList');
  var completedList = document.getElementById('completedList');
  var pendingSection = document.getElementById('pendingSection');
  var completedSection = document.getElementById('completedSection');
  var emptyBox = document.getElementById('tasksEmpty');

  function sorter() {
    switch (state.sort) {
      case 'priority':
        return function (a, b) { return (P.PRIORITY_RANK[a.priority] - P.PRIORITY_RANK[b.priority]) || P.compare(a, b); };
      case 'name':
        return function (a, b) { return a.name.localeCompare(b.name); };
      case 'newest':
        return function (a, b) { return b.createdAt - a.createdAt; };
      default:
        return P.compare;
    }
  }

  function taskHTML(t) {
    var late = P.isOverdue(t);
    return '<li class="task p-' + t.priority + (t.completed ? ' done' : '') + '" data-id="' + t.id + '">' +
      '<button type="button" class="check" data-act="toggle" aria-pressed="' + t.completed + '" ' +
        'aria-label="' + (t.completed ? 'Mark as pending' : 'Mark as completed') + '" ' +
        'title="' + (t.completed ? 'Mark as pending' : 'Mark as completed') + '">' + P.icons.check + '</button>' +
      '<div class="task-main">' +
        '<div class="task-name">' + P.esc(t.name) + '</div>' +
        '<div class="task-meta">' +
          '<span class="meta">' + P.icons.cal + P.relDate(t.date) + '</span>' +
          (t.time ? '<span class="meta">' + P.icons.clock + P.fmtTime(t.time) + '</span>' : '') +
          '<span class="badge">' + P.PRIORITY_LABEL[t.priority] + '</span>' +
          (late ? '<span class="badge badge-overdue">Overdue</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="task-actions">' +
        '<button type="button" class="icon-btn" data-act="edit" aria-label="Edit task" title="Edit">' + P.icons.edit + '</button>' +
        '<button type="button" class="icon-btn danger" data-act="delete" aria-label="Delete task" title="Delete">' + P.icons.trash + '</button>' +
      '</div>' +
    '</li>';
  }

  function fill(listEl, tasks, emptyText) {
    listEl.innerHTML = tasks.length
      ? tasks.map(taskHTML).join('')
      : '<li class="list-empty">' + emptyText + '</li>';
  }

  function render() {
    var all = P.getTasks();
    var q = state.q.trim().toLowerCase();
    var visible = all.filter(function (t) { return !q || t.name.toLowerCase().indexOf(q) !== -1; }).sort(sorter());

    var pending = visible.filter(function (t) { return !t.completed; });
    var done = visible.filter(function (t) { return t.completed; });

    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('completedCount').textContent = done.length;

    var showPending = state.filter !== 'completed';
    var showDone = state.filter !== 'pending';
    pendingSection.hidden = !showPending;
    completedSection.hidden = !showDone;

    fill(pendingList, pending, q ? 'No pending tasks match your search.' : 'You\'re all caught up. Nothing pending!');
    fill(completedList, done, q ? 'No completed tasks match your search.' : 'Completed tasks will show up here.');

    // Brand-new user: show the big empty state instead of two empty lists
    var noTasksAtAll = all.length === 0;
    emptyBox.hidden = !noTasksAtAll;
    if (noTasksAtAll) { pendingSection.hidden = true; completedSection.hidden = true; }

    var totalPending = all.filter(function (t) { return !t.completed; }).length;
    document.getElementById('tasksSummary').textContent = noTasksAtAll
      ? 'Everything on your plate in one place.'
      : totalPending + ' pending · ' + (all.length - totalPending) + ' completed';
  }

  /* ---------- events ---------- */
  function onListClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var id = btn.closest('.task').dataset.id;
    var act = btn.dataset.act;
    if (act === 'toggle') {
      P.toggleTask(id);
    } else if (act === 'edit') {
      PlannifyEditor.open(id);
    } else if (act === 'delete') {
      if (confirm('Delete this task? This cannot be undone.')) { P.removeTask(id); P.toast('Task deleted'); }
    }
  }
  pendingList.addEventListener('click', onListClick);
  completedList.addEventListener('click', onListClick);

  document.getElementById('filterSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (!b) return;
    state.filter = b.dataset.filter;
    this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
    render();
  });
  document.getElementById('taskSearch').addEventListener('input', function () { state.q = this.value; render(); });
  document.getElementById('taskSort').addEventListener('change', function () { state.sort = this.value; render(); });

  document.addEventListener('plannify:tasks', render);
  render();
})();
