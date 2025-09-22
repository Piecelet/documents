/*
  Fix flag icon for Traditional Chinese (zh-Hant).
  - Replaces CN flag with TW flag for zh-Hant entries in language switchers.
  - Sets alt to "TW".

  How it works:
  - Scans buttons/menus that contain the label for Traditional Chinese (繁體中文) or the code zh-Hant.
  - If an <img> within those elements points to CN.svg or has alt "CN", it updates to TW.
  - Observes DOM mutations to re-apply when menus open or route changes.
*/
(function () {
  var TW_SVG = 'https://purecatamphetamine.github.io/country-flag-icons/1x1/TW.svg';
  var CN_SVG = 'https://purecatamphetamine.github.io/country-flag-icons/1x1/CN.svg';

  function textOf(el) {
    if (!el) return '';
    var aria = el.getAttribute('aria-label') || '';
    var inner = (el.innerText || el.textContent || '').trim();
    return (aria + ' ' + inner).trim().toLowerCase();
  }

  function isTraditionalLabel(str) {
    if (!str) return false;
    // Match explicit code or common labels for Traditional Chinese
    return /\bzh[-_]?hant\b/.test(str) || str.includes('繁體中文') || str.includes('繁体中文') || str.includes('traditional chinese');
  }

  function isSimplifiedLabel(str) {
    if (!str) return false;
    // Match explicit code or common labels for Simplified Chinese
    return /\bzh[-_]?hans\b/.test(str) || str.includes('简体中文') || str.includes('simplified chinese');
  }

  function setFlagIn(el, target) {
    // Only update images inside the exact element representing the matched language option
    var imgs = el.querySelectorAll('img');
    imgs.forEach(function (img) {
      var src = img.getAttribute('src') || '';
      var alt = (img.getAttribute('alt') || '').trim();
      var isFlag = /country-flag-icons/.test(src) || /\/(CN|TW)\.svg$/i.test(src);
      if (!isFlag) return;
      var wantSvg = target === 'TW' ? TW_SVG : CN_SVG;
      var wantAlt = target;
      var isCorrect = new RegExp('/' + target + '\\.svg$', 'i').test(src) || alt === wantAlt;
      if (!isCorrect) {
        var bust = wantSvg + '?v=' + Date.now();
        img.setAttribute('src', bust);
        img.setAttribute('alt', wantAlt);
      }
    });
  }

  function scan(root) {
    root = root || document;
    // Candidate elements: trigger button and menu items
    var candidates = root.querySelectorAll('button, [role="menuitem"], [data-lang], [data-language], [lang]');
    candidates.forEach(function (el) {
      var label = textOf(el);
      // Also check language-related attributes directly
      var langAttr = (el.getAttribute('data-lang') || el.getAttribute('data-language') || el.getAttribute('lang') || '').toLowerCase();
      var isTrad = isTraditionalLabel(label) || /\bzh[-_]?hant\b/.test(langAttr);
      var isSimp = isSimplifiedLabel(label) || /\bzh[-_]?hans\b/.test(langAttr);
      if (isTrad) setFlagIn(el, 'TW');
      if (isSimp) setFlagIn(el, 'CN');
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    scan(document);
    // Observe changes (menus opening, route changes in SPA)
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.addedNodes) {
          m.addedNodes.forEach(function (node) {
            if (node && node.nodeType === 1) {
              scan(node);
            }
          });
        }
        // If an image src/alt changes under language UI, rescan that subtree
        if (m.type === 'attributes' && m.target && m.target.tagName === 'IMG') {
          var host = m.target.closest('button, [role="menuitem"], [data-lang], [data-language], [lang]');
          if (host) scan(host);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'alt'] });

    // Re-run on client-side route changes
    var schedule;
    function scheduleScan() {
      clearTimeout(schedule);
      schedule = setTimeout(function () { scan(document); }, 50);
    }
    // Hook history APIs
    ['pushState', 'replaceState'].forEach(function (method) {
      var orig = history[method];
      if (!orig) return;
      try {
        history[method] = function () {
          var ret = orig.apply(this, arguments);
          window.dispatchEvent(new Event('locationchange'));
          scheduleScan();
          return ret;
        };
      } catch (e) {}
    });
    window.addEventListener('popstate', scheduleScan);
    window.addEventListener('hashchange', scheduleScan);
    window.addEventListener('locationchange', scheduleScan);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) scheduleScan(); });
  });
})();
