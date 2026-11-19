/* Add Task page */
(function () {
  'use strict';

  var P = window.Plannify;
  var form = document.getElementById('addForm');
  var err = document.getElementById('addError');
  var els = form.elements;

  function defaultDate() {
    var q = new URLSearchParams(location.search).get('date');
    return /^\d{4}-\d{2}-\d{2}$/.test(q || '') ? q : P.todayISO();
  }

  function resetForm() {
    form.reset();
    els.date.value = defaultDate();
    els.priority.value = 'medium';
    err.hidden = true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = els.taskName.value.trim();
    if (!name) { showError('Please give your task a name.', els.taskName); return; }
    if (!els.date.value) { showError('Please choose a due date.', els.date); return; }

    P.addTask({
      name: name,
      date: els.date.value,
      time: els.time.value,
      priority: els.priority.value
    });
    P.toast('Task added');
    resetForm();
    els.taskName.focus();
  });

  document.getElementById('addReset').addEventListener('click', function (e) {
    e.preventDefault();
    resetForm();
  });

  function showError(msg, field) {
    err.textContent = msg;
    err.hidden = false;
    field.focus();
  }

  /* ---------- side panel: stats + up next ---------- */
  function renderSide() {
    var all = P.getTasks();
    var pending = all.filter(function (t) { return !t.completed; });
    var today = P.todayISO();

    document.getElementById('statPending').textContent = pending.length;
    document.getElementById('statDone').textContent = all.length - pending.length;
    document.getElementById('statToday').textContent = pending.filter(function (t) { return t.date === today; }).length;

    var list = document.getElementById('upNext');
    var next = pending.slice().sort(P.compare).slice(0, 5);
    if (!next.length) {
      list.innerHTML = '<li class="mini-empty">Nothing pending. Add a task to get started.</li>';
      return;
    }
    list.innerHTML = next.map(function (t) {
      var late = P.isOverdue(t);
      var when = P.relDate(t.date) + (t.time ? ' · ' + P.fmtTime(t.time) : '');
      return '<li class="mini-item p-' + t.priority + '">' +
        '<span class="mi-name">' + P.esc(t.name) + '</span>' +
        '<span class="mi-when' + (late ? ' late' : '') + '">' + (late ? 'Overdue · ' : '') + when + '</span></li>';
    }).join('');
  }

  document.addEventListener('plannify:tasks', renderSide);
  resetForm();
  renderSide();
})();
