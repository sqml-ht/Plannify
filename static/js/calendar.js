/* Calendar page – Google-Calendar-style Month / Week / Day views */
(function () {
  'use strict';

  var P = window.Plannify;
  var S = window.PlannifySettings;
  var root = document.getElementById('calendar');
  if (!root) return;

  var body = document.getElementById('calBody');
  var titleEl = document.getElementById('calTitle');
  var ADD_URL = root.dataset.addUrl;

  var HOUR = 52;   // px per hour in week/day view
  var DUR = 60;    // minutes a timed task occupies visually
  var VIEW_KEY = 'plannify.calview';

  var view = 'month';
  try { view = localStorage.getItem(VIEW_KEY) || 'month'; } catch (e) {}
  if (['month', 'week', 'day'].indexOf(view) === -1) view = 'month';

  var cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  /* ---------- date helpers ---------- */
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) {
    var x = new Date(d);
    x.setDate(x.getDate() - ((x.getDay() - S.get().weekStart + 7) % 7));
    return x;
  }
  function sameMonthAsToday(d) {
    var t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
  }
  function hourLabel(h) { return ((h % 12) || 12) + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function shortTime(t) { return P.fmtTime(t).replace(' ', '').toLowerCase(); }

  function groupByDate() {
    var map = {};
    P.getTasks().forEach(function (t) { (map[t.date] = map[t.date] || []).push(t); });
    Object.keys(map).forEach(function (k) { map[k].sort(P.compare); });
    return map;
  }

  function title() {
    if (view === 'month') return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (view === 'day') return cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    var s = startOfWeek(cursor), e = addDays(s, 6);
    var mon = function (d) { return d.toLocaleDateString('en-US', { month: 'short' }); };
    var left = mon(s) + ' ' + s.getDate();
    var right = (s.getMonth() === e.getMonth() ? '' : mon(e) + ' ') + e.getDate() + ', ' + e.getFullYear();
    if (s.getFullYear() !== e.getFullYear()) left += ', ' + s.getFullYear();
    return left + ' – ' + right;
  }

  /* ---------- chip (month cell / all-day row) ---------- */
  function chip(t) {
    return '<button type="button" class="chip p-' + t.priority + (t.completed ? ' done' : '') + '" data-id="' + t.id + '" title="' + P.esc(t.name) + '">' +
      (t.time ? '<span class="ct">' + shortTime(t.time) + '</span>' : '') +
      '<span class="cn">' + P.esc(t.name) + '</span></button>';
  }

  /* ---------- Month view ---------- */
  function renderMonth() {
    var first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    var last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    var start = startOfWeek(first);
    var end = addDays(startOfWeek(last), 6);
    var by = groupByDate();
    var today = P.todayISO();

    var h = '<div class="m-head">';
    for (var i = 0; i < 7; i++) h += '<div>' + addDays(start, i).toLocaleDateString('en-US', { weekday: 'short' }) + '</div>';
    h += '</div><div class="m-grid">';

    for (var d = new Date(start); d <= end; d = addDays(d, 1)) {
      var key = P.iso(d);
      var list = by[key] || [];
      h += '<div class="m-day' + (d.getMonth() !== cursor.getMonth() ? ' other' : '') + (key === today ? ' today' : '') + '">' +
        '<div class="m-top">' +
          '<button type="button" class="m-num" data-goto="' + key + '" aria-label="Open day view for ' + key + '">' + d.getDate() + '</button>' +
          '<a class="m-add" href="' + ADD_URL + '?date=' + key + '" title="Add a task on this day" aria-label="Add task on ' + key + '">+</a>' +
        '</div><div class="chips">';
      list.slice(0, 3).forEach(function (t) { h += chip(t); });
      if (list.length > 3) h += '<button type="button" class="more" data-goto="' + key + '">+' + (list.length - 3) + ' more</button>';
      h += '</div></div>';
    }
    body.innerHTML = h + '</div>';
  }

  /* ---------- Week / Day view ---------- */
  // Place overlapping tasks side by side
  function layout(list) {
    list.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
    var clusters = [], cur = [], curEnd = -1;
    list.forEach(function (t) {
      var p = t.time.split(':').map(Number);
      t._start = p[0] * 60 + p[1];
      if (cur.length && t._start >= curEnd) { clusters.push(cur); cur = []; curEnd = -1; }
      cur.push(t);
      curEnd = Math.max(curEnd, t._start + DUR);
    });
    if (cur.length) clusters.push(cur);

    clusters.forEach(function (c) {
      var laneEnds = [];
      c.forEach(function (t) {
        var lane = laneEnds.findIndex(function (end) { return end <= t._start; });
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = t._start + DUR;
        t._lane = lane;
      });
      c.forEach(function (t) { t._lanes = laneEnds.length; });
    });
  }

  function renderTime(n) {
    var start = n === 7 ? startOfWeek(cursor) : new Date(cursor);
    var days = [];
    for (var i = 0; i < n; i++) days.push(addDays(start, i));
    var by = groupByDate();
    var today = P.todayISO();
    var cols = 'grid-template-columns:3.5rem repeat(' + n + ',minmax(0,1fr))';

    var h = '<div class="tg-wrap" id="tgWrap" data-n="' + n + '">';

    // sticky header: day names + all-day row
    h += '<div class="tg-sticky"><div class="tg-row" style="' + cols + '"><div></div>';
    days.forEach(function (d) {
      var k = P.iso(d);
      h += '<div class="tg-dh' + (k === today ? ' today' : '') + '"><span class="dow">' +
        d.toLocaleDateString('en-US', { weekday: 'short' }) + '</span>' +
        '<button type="button" class="dnum" data-goto="' + k + '" aria-label="Open day view for ' + k + '">' + d.getDate() + '</button></div>';
    });
    h += '</div><div class="tg-row tg-all" style="' + cols + '"><div class="tg-label">All day</div>';
    days.forEach(function (d) {
      var allDay = (by[P.iso(d)] || []).filter(function (t) { return !t.time; });
      h += '<div class="tg-allcell">' + allDay.map(chip).join('') + '</div>';
    });
    h += '</div></div>';

    // time grid
    var total = 24 * HOUR;
    h += '<div class="tg-row" style="' + cols + '"><div class="tg-gutter" style="height:' + total + 'px">';
    for (var hr = 1; hr < 24; hr++) h += '<span style="top:' + hr * HOUR + 'px">' + hourLabel(hr) + '</span>';
    h += '</div>';

    var now = new Date();
    days.forEach(function (d) {
      var k = P.iso(d);
      var timed = (by[k] || []).filter(function (t) { return t.time; });
      layout(timed);
      h += '<div class="tg-col' + (k === today ? ' today' : '') + '" style="height:' + total + 'px;--hour:' + HOUR + 'px">';
      timed.forEach(function (t) {
        var top = t._start / 60 * HOUR;
        var height = DUR / 60 * HOUR - 2;
        h += '<button type="button" class="ev p-' + t.priority + (t.completed ? ' done' : '') + '" data-id="' + t.id + '" ' +
          'style="top:' + top + 'px;height:' + height + 'px;left:calc(' + t._lane + ' * 100% / ' + t._lanes + ' + 2px);width:calc(100% / ' + t._lanes + ' - 4px)" ' +
          'title="' + P.esc(t.name) + '">' +
          '<span class="et">' + P.fmtTime(t.time) + '</span><span class="en">' + P.esc(t.name) + '</span></button>';
      });
      if (k === today) h += '<div class="now" style="top:' + (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR + 'px"></div>';
      h += '</div>';
    });
    h += '</div></div>';

    body.innerHTML = h;
  }

  /* ---------- render / navigation ---------- */
  function render(keepScroll) {
    var prev = document.getElementById('tgWrap');
    var scrollTop = prev ? prev.scrollTop : null;

    titleEl.textContent = title();
    document.querySelectorAll('#calViews button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });

    if (view === 'month') renderMonth();
    else renderTime(view === 'week' ? 7 : 1);

    var wrap = document.getElementById('tgWrap');
    if (wrap) {
      if (keepScroll && scrollTop !== null) {
        wrap.scrollTop = scrollTop;
      } else {
        var hourNow = new Date().getHours();
        wrap.scrollTop = Math.max(0, (sameMonthAsToday(cursor) ? hourNow - 2 : 7)) * HOUR;
      }
    }
  }

  function setView(v) {
    if (v !== 'month' && view === 'month' && sameMonthAsToday(cursor)) {
      cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    }
    view = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch (e) {}
    render();
  }

  function shift(dir) {
    if (view === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    else cursor = addDays(cursor, dir * (view === 'week' ? 7 : 1));
    render();
  }

  document.getElementById('calPrev').addEventListener('click', function () { shift(-1); });
  document.getElementById('calNext').addEventListener('click', function () { shift(1); });
  document.getElementById('calToday').addEventListener('click', function () {
    cursor = new Date(); cursor.setHours(0, 0, 0, 0); render();
  });
  document.getElementById('calViews').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]');
    if (b) setView(b.dataset.view);
  });

  body.addEventListener('click', function (e) {
    var go = e.target.closest('[data-goto]');
    if (go) {
      cursor = P.parseISO(go.dataset.goto);
      setView('day');
      return;
    }
    var item = e.target.closest('[data-id]');
    if (item) PlannifyEditor.open(item.dataset.id);
  });

  document.addEventListener('plannify:tasks', function () { render(true); });
  document.addEventListener('plannify:settings', function () { render(true); });

  render();
})();
