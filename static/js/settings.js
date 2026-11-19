/* Settings page */
(function () {
  'use strict';

  var P = window.Plannify;
  var S = window.PlannifySettings;

  var THEMES = [
    { id: 'vanilla',    name: 'Vanilla',     colors: ['#dae3f3', '#665687', '#190933', '#edeba0', '#e0d8f3'] },
    { id: 'coolsteel',  name: 'Cool Steel',  colors: ['#1c2321', '#7d98a1', '#5e6572', '#a9b4c2', '#eef1ef'] },
    { id: 'limeblue',   name: 'Lime Blue',   colors: ['#7d84b2', '#8e9dcc', '#d9dbf1', '#f9f9ed', '#dbf4a7'] },
    { id: 'pastelpink', name: 'Pastel Pink', colors: ['#d8e2dc', '#ffffff', '#ffcad4', '#f4acb7', '#9d8189'] },
    { id: 'dustyolive', name: 'Dusty Olive', colors: ['#1d1e18', '#6b8f71', '#aad2ba', '#d9fff5', '#b9f5d8'] }
  ];

  var FONT_LIST = [
    { id: 'inter',   name: 'Inter' },
    { id: 'poppins', name: 'Poppins' },
    { id: 'nunito',  name: 'Nunito (rounded)' },
    { id: 'merri',   name: 'Merriweather (serif)' },
    { id: 'mono',    name: 'JetBrains Mono' }
  ];

  var themeGrid = document.getElementById('themeGrid');
  var fontGrid = document.getElementById('fontGrid');
  var range = document.getElementById('sizeRange');
  var out = document.getElementById('sizeOut');

  function render() {
    var s = S.get();

    themeGrid.innerHTML = THEMES.map(function (t) {
      var on = t.id === s.theme;
      return '<button type="button" class="theme-card' + (on ? ' active' : '') + '" data-theme-id="' + t.id + '" aria-pressed="' + on + '">' +
        '<span class="swatches">' + t.colors.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' +
        '<span class="theme-name">' + t.name + (t.id === 'coolsteel' ? '<span class="tag">Default</span>' : '') + '</span></button>';
    }).join('');

    fontGrid.innerHTML = FONT_LIST.map(function (f) {
      var on = f.id === s.font;
      return '<button type="button" class="font-card' + (on ? ' active' : '') + '" data-font-id="' + f.id + '" aria-pressed="' + on + '" ' +
        'style="font-family:' + S.FONTS[f.id] + '"><span class="aa">Aa</span><span class="fname">' + f.name + '</span></button>';
    }).join('');

    document.querySelectorAll('#modeSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === s.mode); });
    document.querySelectorAll('#weekSeg button').forEach(function (b) { b.classList.toggle('active', Number(b.dataset.week) === s.weekStart); });

    range.value = s.size;
    out.textContent = s.size + ' px';
  }

  themeGrid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-id]');
    if (b) { S.save({ theme: b.dataset.themeId }); render(); }
  });
  fontGrid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-font-id]');
    if (b) { S.save({ font: b.dataset.fontId }); render(); }
  });
  document.getElementById('modeSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (b) { S.save({ mode: b.dataset.mode }); render(); }
  });
  document.getElementById('weekSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-week]');
    if (b) { S.save({ weekStart: Number(b.dataset.week) }); render(); }
  });
  range.addEventListener('input', function () {
    S.save({ size: Number(range.value) });
    out.textContent = range.value + ' px';
  });
  document.getElementById('sizePresets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-size]');
    if (b) { S.save({ size: Number(b.dataset.size) }); render(); }
  });

  /* ---------- data ---------- */
  document.getElementById('sampleBtn').addEventListener('click', function () {
    var rows = [
      ['Team stand-up', 0, '09:30', 'medium'],
      ['Finish project report', 0, '17:00', 'high'],
      ['Gym session', 0, '19:00', 'low'],
      ['Call mom', 1, '20:00', 'medium'],
      ['Buy groceries', 1, '', 'low'],
      ['Dentist appointment', 2, '11:00', 'high'],
      ['Submit assignment', 3, '23:59', 'high'],
      ['Plan weekend trip', 5, '', 'low'],
      ['Review pull requests', -1, '14:00', 'medium'],
      ['Pay electricity bill', -2, '', 'high', true]
    ];
    var now = new Date();
    P.addMany(rows.map(function (r) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + r[1]);
      return { name: r[0], date: P.iso(d), time: r[2], priority: r[3], completed: !!r[4] };
    }));
    P.toast('Sample tasks added');
  });

  document.getElementById('clearBtn').addEventListener('click', function () {
    if (confirm('Delete ALL tasks? This cannot be undone.')) {
      P.clearAll();
      P.toast('All tasks deleted');
    }
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    S.reset();
    render();
    P.toast('Appearance reset to defaults');
  });

  render();
})();
