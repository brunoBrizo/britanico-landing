/* Instituto Británico de Rivera — Prototype A · "La Línea, a la luz del día"
   The spine: one line from the logo's red "i" to the door of the school.
   Waypoints are elements with [data-wp]; the line is routed through their centres
   with right angles and round corners, drawn as the page scrolls, and coloured
   in runs (data-wp-c). Stations ([data-wp].stn) fill in when the line reaches them. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desk = window.matchMedia("(min-width: 1100px)");
  if (/[?&]slow\b/.test(location.search)) root.classList.add("slow-motion"); // review aid: 3x slower load
  var TEMPO = root.classList.contains("slow-motion") ? 3 : 1;
  var NS = "http://www.w3.org/2000/svg";

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function f(n) { return (Math.round(n * 10) / 10).toString(); }
  function mk(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ------------------------------------------------------------
     Load: wait for the variable font (so nothing reflows mid-animation), then go
     ------------------------------------------------------------ */
  var loaded = false;
  function go() {
    if (loaded) return;
    loaded = true;
    root.classList.add("is-loaded");
    render();
    startIntro();
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('820 64px "Archivo"'),
      document.fonts.load('400 18px "Archivo"')
    ]).then(go, go);
  }
  setTimeout(go, 1000); // never hold the hero hostage to a slow font

  /* ------------------------------------------------------------
     Header: compact menu on phones, hides on the way down
     ------------------------------------------------------------ */
  var top = $("top");
  var menuBtn = $("menuBtn");
  var menuTxt = menuBtn.querySelector(".menu-txt");
  var nav = $("nav");
  var lastY = window.scrollY;

  function setMenu(open) {
    root.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuTxt.textContent = open ? "Cerrar" : "Menú";
  }
  menuBtn.addEventListener("click", function () { setMenu(!root.classList.contains("nav-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("nav-open")) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (root.classList.contains("nav-open") && !top.contains(e.target)) setMenu(false);
  });

  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (a) { a.classList.toggle("is-current", a.getAttribute("href") === "#" + en.target.id); });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main > section").forEach(function (s) { spy.observe(s); });

  /* ------------------------------------------------------------
     The spine
     ------------------------------------------------------------ */
  var svg = $("spine");
  var COL = { blue: "#00247D", red: "#CF142B", white: "#FFFFFF" };
  var TRK = { blue: "#DCE3F3", red: "#F3D0D5", white: "rgba(255,255,255,.26)" };
  var lines = {};
  var stationEls = [];
  var head = null, headR = 8;
  var intro = { L: 0, p: 0 };

  function lineNames(el, isD) {
    var v = (isD ? el.getAttribute("data-line-d") : el.getAttribute("data-line-m")) || el.getAttribute("data-line") || "main";
    return v.split(/\s+/);
  }

  // Waypoints → points in document coordinates, grouped by line
  function collect() {
    var isD = desk.matches, sx = window.scrollX, sy = window.scrollY, groups = {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-wp]"), function (el) {
      var only = el.getAttribute("data-wp-only");
      if ((only === "m" && isD) || (only === "d" && !isD)) return;
      if (!el.getClientRects().length) return; // display: none
      var r = el.getBoundingClientRect();
      var ym = el.getAttribute("data-wp-y");
      var x = r.left + r.width / 2 + sx;
      var y = (ym === "b" ? r.bottom : ym === "t" ? r.top : r.top + r.height / 2) + sy;
      lineNames(el, isD).forEach(function (name) {
        (groups[name] = groups[name] || []).push({
          x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, el: el,
          c: el.getAttribute("data-wp-c"), via: el.getAttribute("data-wp-via") || "v",
          stn: el.classList.contains("stn"), intro: el.hasAttribute("data-wp-intro")
        });
      });
    });
    return groups;
  }

  // Make every step horizontal or vertical: insert a corner where both x and y change
  function orth(raw) {
    var out = [];
    raw.forEach(function (q) {
      if (!out.length) { out.push(q); return; }
      var p = out[out.length - 1];
      if (Math.abs(q.x - p.x) < 3) q.x = p.x;
      if (Math.abs(q.y - p.y) < 3) q.y = p.y;
      if (q.x === p.x && q.y === p.y) {
        if (q.stn) { p.stn = true; p.el = q.el; }
        if (q.c) p.c = q.c;
        if (q.intro) p.intro = true;
        return;
      }
      if (q.x !== p.x && q.y !== p.y) {
        out.push(q.via === "h" ? { x: q.x, y: p.y, corner: true } : { x: p.x, y: q.y, corner: true });
      }
      out.push(q);
    });
    return out;
  }

  function dir(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    return { x: dx > 0 ? 1 : dx < 0 ? -1 : 0, y: dy > 0 ? 1 : dy < 0 ? -1 : 0 };
  }
  function dist(a, b) { return Math.abs(b.x - a.x) + Math.abs(b.y - a.y); }
  function addLine(prims, a, b, L) {
    var len = dist(a, b);
    if (len > 0.01) prims.push({ k: "l", a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, L0: L, len: len });
    return L + len;
  }

  // Straight runs and quarter-circle corners, with the length of every point along the line
  function build(pts, R) {
    var prims = [], L = 0, cur = { x: pts[0].x, y: pts[0].y };
    pts[0].L = 0;
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i], prev = pts[i - 1], next = pts[i + 1];
      var u = dir(prev, p), v = next ? dir(p, next) : u;
      if (next && (u.x !== v.x || u.y !== v.y)) {
        var r = Math.min(R, dist(prev, p) / 2, dist(p, next) / 2);
        var a = { x: p.x - u.x * r, y: p.y - u.y * r };
        var b = { x: p.x + v.x * r, y: p.y + v.y * r };
        L = addLine(prims, cur, a, L);
        prims.push({ k: "a", a: a, b: b, u: u, v: v, r: r, L0: L, len: Math.PI * r / 2 });
        p.L = L + Math.PI * r / 4;
        L += Math.PI * r / 2;
        cur = b;
      } else {
        L = addLine(prims, cur, p, L);
        cur = { x: p.x, y: p.y };
        p.L = L;
      }
    }
    return { prims: prims, total: L };
  }

  function posIn(p, d) {
    if (p.k === "l") {
      var t = p.len ? d / p.len : 0;
      return { x: p.a.x + (p.b.x - p.a.x) * t, y: p.a.y + (p.b.y - p.a.y) * t };
    }
    var th = d / p.r, cx = p.a.x + p.v.x * p.r, cy = p.a.y + p.v.y * p.r;
    return {
      x: cx - p.v.x * p.r * Math.cos(th) + p.u.x * p.r * Math.sin(th),
      y: cy - p.v.y * p.r * Math.cos(th) + p.u.y * p.r * Math.sin(th)
    };
  }
  function at(g, L) {
    L = clamp(L, 0, g.total);
    for (var i = 0; i < g.prims.length; i++) {
      var p = g.prims[i];
      if (L <= p.L0 + p.len || i === g.prims.length - 1) return posIn(p, clamp(L - p.L0, 0, p.len));
    }
    return { x: 0, y: 0 };
  }

  // SVG path for the stretch between two lengths (colour changes always sit on straight runs)
  function dRange(g, L0, L1) {
    var s = at(g, L0), d = "M" + f(s.x) + " " + f(s.y);
    g.prims.forEach(function (p) {
      var a0 = p.L0, a1 = p.L0 + p.len;
      if (a1 <= L0 + 0.01 || a0 >= L1 - 0.01) return;
      if (p.k === "l") {
        var e = at(g, Math.min(a1, L1));
        d += "L" + f(e.x) + " " + f(e.y);
      } else {
        var sweep = (p.u.x * p.v.y - p.u.y * p.v.x) > 0 ? 1 : 0;
        d += "A" + f(p.r) + " " + f(p.r) + " 0 0 " + sweep + " " + f(p.b.x) + " " + f(p.b.y);
      }
    });
    return d;
  }

  /* Scroll → length. Each sample gets a "trigger" T: the scroll line that must reach it.
     Going down, T follows y. Going sideways, T keeps growing, so horizontal runs draw
     over a stretch of scroll instead of all at once; afterwards T catches up with y again. */
  function sample(g) {
    var out = [], step = 4, T = 0, prev = null;
    for (var L = 0; ; L += step) {
      var l = Math.min(L, g.total), p = at(g, l);
      if (!prev) T = p.y;
      else T = Math.max(p.y, T + Math.max(p.y - prev.y, 0) * 0.5 + Math.abs(p.x - prev.x) * 0.6);
      out.push({ L: l, T: T });
      prev = p;
      if (l >= g.total) break;
    }
    return out;
  }
  function lenFor(g, s) {
    var a = g.samples, n = a.length;
    if (!n || s <= a[0].T) return 0;
    if (s >= a[n - 1].T) return g.total;
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (a[mid].T <= s) lo = mid; else hi = mid; }
    var A = a[lo], B = a[hi];
    return A.L + (B.L - A.L) * (B.T > A.T ? (s - A.T) / (B.T - A.T) : 1);
  }

  function runAt(g, L) {
    for (var i = 0; i < g.runs.length; i++) {
      var r = g.runs[i];
      if (L >= r.L0 - 0.5 && (L < r.L1 - 0.5 || i === g.runs.length - 1)) return r;
    }
    return g.runs[g.runs.length - 1];
  }

  var lw = $("lw"), hero = $("inicio"), heroH = 1, lwH = 1;

  function render() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    lines = {};
    var W = root.clientWidth, H = 0;
    var cs = getComputedStyle(root);
    var lineW = parseFloat(cs.getPropertyValue("--line-w")) || 8;
    var R = desk.matches ? 40 : 22;
    var groups = collect();
    var trkG = mk("g", {}), lineG = mk("g", {});
    svg.appendChild(trkG);
    svg.appendChild(lineG);
    var seen = [];

    // branch lines first, so the main line has the last word on shared stations
    Object.keys(groups).sort(function (a, b) { return a === "main" ? 1 : b === "main" ? -1 : 0; }).forEach(function (name) {
      var pts = orth(groups[name]);
      if (pts.length < 2) return;
      var g = build(pts, R);
      g.name = name;
      g.pts = pts;

      // colour runs
      g.runs = [];
      var c = pts[0].c || "blue", start = 0;
      pts.forEach(function (p, i) {
        if (i > 0 && p.c && p.c !== c) { g.runs.push({ c: c, L0: start, L1: p.L }); c = p.c; start = p.L; }
      });
      g.runs.push({ c: c, L0: start, L1: g.total });

      g.runs.forEach(function (run) {
        var d = dRange(g, run.L0, run.L1);
        run.len = Math.max(0.01, run.L1 - run.L0);
        trkG.appendChild(mk("path", { d: d, stroke: TRK[run.c] }));
        run.path = mk("path", { d: d, stroke: COL[run.c], pathLength: run.len.toFixed(2) });
        run.path.style.strokeDasharray = run.len.toFixed(2) + " " + (run.len * 2 + 10).toFixed(2);
        run.path.style.strokeDashoffset = run.len.toFixed(2);
        run.v = -1;
        lineG.appendChild(run.path);
      });

      g.samples = sample(g);
      g.stations = [];
      pts.forEach(function (p) {
        H = Math.max(H, p.y);
        if (!p.stn) return;
        var run = runAt(g, p.L);
        var own = p.el.getAttribute("data-stn-c");
        p.el.style.setProperty("--c", COL[own || run.c]);
        p.el.style.setProperty("--t", run.c === "white" ? "rgba(255,255,255,.4)" : TRK[run.c]);
        g.stations.push({ el: p.el, L: p.L, r: p.el.offsetWidth / 2 });
        if (seen.indexOf(p.el) < 0) seen.push(p.el);
      });
      lines[name] = g;
    });
    stationEls = seen;

    // the head: the logo's i-dot travelling down the line
    var hr = headR = desk.matches ? 11 : 8;
    head = mk("g", { "class": "spine-head" });
    head.appendChild(mk("circle", { r: hr + 2.5, fill: "#FFFFFF" }));
    head.appendChild(mk("circle", { r: hr, fill: COL.red }));
    head.appendChild(mk("circle", { r: hr * 0.56, fill: "none", stroke: "#FFFFFF", "stroke-width": desk.matches ? 2 : 1.6 }));
    head.style.opacity = 0;
    head.style.transition = "opacity .15s";
    svg.appendChild(head);

    H = Math.ceil(H + 60);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.style.width = W + "px";
    svg.style.height = H + "px";
    svg.style.setProperty("--line-w", lineW + "px");

    intro.L = 0;
    if (lines.main) lines.main.pts.forEach(function (p) { if (p.intro && !intro.L) intro.L = p.L; });

    heroH = hero.offsetHeight || 1;
    lwH = lw.offsetHeight || 1;
    update();
  }

  /* ------------------------------------------------------------
     Per frame: draw, light stations, move the head
     ------------------------------------------------------------ */
  var dock = $("dock"), heroCta = hero.querySelector(".hero-cta"), contact = $("contacto");

  function update() {
    var sy = window.scrollY, vh = window.innerHeight;
    var s = sy + vh * 0.62;
    var full = reduce.matches || (sy + vh >= root.scrollHeight - 4 && sy > 0);
    var lit = [];

    Object.keys(lines).forEach(function (name) {
      var g = lines[name];
      var L = full ? g.total : lenFor(g, s);
      if (name === "main" && intro.p > 0) L = Math.max(L, intro.L * intro.p);
      g.drawn = L;
      g.runs.forEach(function (run) {
        var v = clamp(L - run.L0, 0, run.len);
        if (Math.abs(v - run.v) > 0.05) { run.v = v; run.path.style.strokeDashoffset = (run.len - v).toFixed(2); }
      });
      g.stations.forEach(function (st) {
        if (L > 0.5 && L >= st.L - 0.5 && lit.indexOf(st.el) < 0) lit.push(st.el);
      });
    });
    stationEls.forEach(function (el) {
      var v = lit.indexOf(el) >= 0;
      if (el.__on !== v) { el.__on = v; el.classList.toggle("is-on", v); }
    });

    // the travelling dot hides while it passes a station, so it never doubles up with one
    var m = lines.main;
    var nearStn = m && m.stations.some(function (st) { return Math.abs(st.L - m.drawn) < st.r + headR + 6; });
    if (head && m && !reduce.matches && !nearStn && m.drawn > 1 && m.drawn < m.total - 1) {
      var p = at(m, m.drawn);
      head.setAttribute("transform", "translate(" + f(p.x) + " " + f(p.y) + ")");
      head.style.opacity = 1;
    } else if (head) {
      head.style.opacity = 0;
    }

    // hero: the photo moves a little slower than the letters, so they read as a window
    if (!reduce.matches && sy < heroH + 200) {
      lw.style.setProperty("--py", (clamp(sy / heroH, 0, 1) * lwH * 0.07).toFixed(1) + "px");
    }

    // header
    top.classList.toggle("is-scrolled", sy > 4);
    if (!root.classList.contains("nav-open")) {
      if (sy > 420 && sy > lastY + 4) top.classList.add("is-hidden");
      else if (sy < lastY - 4 || sy < 420) top.classList.remove("is-hidden");
    }
    lastY = sy;

    // phones: WhatsApp dock once the hero button is gone, out of the way over Contacto
    if (!desk.matches) {
      var cb = heroCta.getBoundingClientRect().bottom;
      var ct = contact.getBoundingClientRect().top;
      dock.classList.toggle("is-shown", cb < 0 && ct > vh - 40);
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }

  /* After the logo has assembled, the line drops out of the red bar to the first station */
  function startIntro() {
    if (reduce.matches) return;
    setTimeout(function () {
      var t0 = performance.now(), dur = 1000 * TEMPO;
      function step(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        intro.p = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        update();
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, 1700 * TEMPO);
  }

  var rt = 0;
  function rerender() { clearTimeout(rt); rt = setTimeout(render, 90); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", rerender);
  window.addEventListener("load", rerender);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rerender);
  if (typeof ResizeObserver === "function") new ResizeObserver(rerender).observe($("main"));
  [desk, reduce].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener("change", function () { setMenu(false); rerender(); });
  });

  /* ------------------------------------------------------------
     Photos develop from brand blue into full colour, once
     ------------------------------------------------------------ */
  var devs = document.querySelectorAll(".dev");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(devs, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(devs, function (el) { el.classList.add("is-in"); });
  }

  /* ------------------------------------------------------------
     Niveles: which levels each course covers
     ------------------------------------------------------------ */
  var map = $("map"), cap = $("pickCap");
  var lvls = Array.prototype.slice.call(map.querySelectorAll(".lvl"));
  var pickBtns = Array.prototype.slice.call(document.querySelectorAll(".pick button"));
  var COURSES = {
    kids: { s: 1, e: 3, name: "Kids", txt: " va de Pre-A1 a A2: empieza a los\u00a04\u00a0años." },
    teens: { s: 3, e: 5, name: "Teens", txt: " va de A2 a B2, durante el\u00a0liceo." },
    adults: { s: 2, e: 7, name: "Adults", txt: " va de A1 a C2: cada adulto empieza en su\u00a0nivel." },
    cam: { s: 5, e: 7, name: "Cambridge", txt: ": B2\u00a0First, C1\u00a0Advanced y C2\u00a0Proficiency." }
  };
  function pick(id) {
    var c = COURSES[id];
    if (!c) return;
    map.setAttribute("data-sel", id);
    pickBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-course") === id)); });
    var b = document.createElement("b");
    b.textContent = c.name;
    cap.textContent = "";
    cap.appendChild(b);
    cap.appendChild(document.createTextNode(c.txt));
    lvls.forEach(function (li, i) { li.classList.toggle("is-in", i + 1 >= c.s && i + 1 <= c.e); });
  }
  pickBtns.forEach(function (b) {
    b.addEventListener("click", function () { pick(b.getAttribute("data-course")); });
  });
  pick("kids");

  render();
})();
