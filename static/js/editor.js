/* Edit-task dialog shared by the To-Do List and Calendar pages. */
(function () {
  'use strict';

  var P = window.Plannify;
  var dlg = document.getElementById('editDialog');
  if (!dlg) return;

  var form = document.getElementById('editForm');
  var els = form.elements;
  var currentId = null;

  function open(id) {
    var t = P.getTask(id);
    if (!t) return;
    currentId = id;
    els.taskName.value = t.name;
    els.date.value = t.date;
    els.time.value = t.time || '';
    els.priority.value = t.priority;
    els.completed.checked = !!t.completed;
    dlg.showModal();
    els.taskName.focus();
  }

  function close() { dlg.close(); currentId = null; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = els.taskName.value.trim();
    if (!name) { els.taskName.focus(); P.toast('Please give the task a name'); return; }
    if (!els.date.value) { els.date.focus(); P.toast('Please choose a due date'); return; }
    P.updateTask(currentId, {
      name: name,
      date: els.date.value,
      time: els.time.value,
      priority: els.priority.value,
      completed: els.completed.checked
    });
    close();
    P.toast('Task updated');
  });

  document.getElementById('editDelete').addEventListener('click', function () {
    if (!currentId) return;
    if (confirm('Delete this task? This cannot be undone.')) {
      P.removeTask(currentId);
      close();
      P.toast('Task deleted');
    }
  });

  dlg.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });

  // Click on the backdrop (outside the dialog box) closes it
  dlg.addEventListener('mousedown', function (e) {
    if (e.target === dlg) close();
  });

  window.PlannifyEditor = { open: open };
})();
