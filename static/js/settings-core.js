/* Plannify settings core – loaded in <head> so the saved look is applied before first paint. */
(function () {
  'use strict';

  var KEY = 'plannify.settings';

  var DEFAULTS = { theme: 'vanilla', mode: 'light', font: 'inter', size: 16, weekStart: 1 };

  var FONTS = {
    inter:    "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    poppins:  "'Poppins', system-ui, sans-serif",
    nunito:   "'Nunito', system-ui, sans-serif",
    merri:    "'Merriweather', Georgia, 'Times New Roman', serif",
    mono:     "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace"
  };

  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  function get() {
    var s = copy(DEFAULTS);
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && typeof saved === 'object') {
        for (var k in DEFAULTS) { if (saved[k] !== undefined) s[k] = saved[k]; }
      }
    } catch (e) { /* ignore corrupt storage */ }
    s.size = Math.min(22, Math.max(12, Number(s.size) || 16));
    s.weekStart = Number(s.weekStart) === 0 ? 0 : 1;
    return s;
  }

  function apply(s) {
    var root = document.documentElement;
    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-mode', s.mode);
    root.style.setProperty('--font', FONTS[s.font] || FONTS.inter);
    root.style.fontSize = s.size + 'px';
  }

  function save(patch) {
    var s = get();
    for (var k in patch) { s[k] = patch[k]; }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage full / blocked */ }
    apply(s);
    document.dispatchEvent(new CustomEvent('plannify:settings', { detail: s }));
    return s;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    var s = get();
    apply(s);
    document.dispatchEvent(new CustomEvent('plannify:settings', { detail: s }));
    return s;
  }

  window.PlannifySettings = { DEFAULTS: DEFAULTS, FONTS: FONTS, get: get, save: save, reset: reset, apply: apply };

  apply(get());
})();
