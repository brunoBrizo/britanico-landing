/* Instituto Británico de Rivera — Direction B · "La Puerta"
   1. The step-through: the facade pins, the real doorway in the photograph
      opens onto the patio and grows until you are inside.
   2. The menu: one list, a popover on phones and tablets, inline on desktop.
   3. The staircase: tap a course to see which steps it covers. */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wide = window.matchMedia("(min-width: 1000px)");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const $ = (id) => document.getElementById(id);

  /* ---------------- 1. The door ---------------- */
  const run = $("doorRun");
  const stage = $("doorStage");
  const scene = $("doorScene");
  const copy = $("heroCopy");
  const ph = $("facadePh");
  const img = $("facadeImg");
  const patio = $("patio");
  const patioImg = $("patioImg");
  const pframe = $("pframe");
  const plaque = $("pasa");
  const facadeCap = scene && scene.querySelector(".facade-cap");
  const cue = $("doorCue");

  // The painted door frame in the source photograph (fachada.webp, 1440 × 821):
  // outer edge of the blue band, from the lintel down to the step.
  const SRC = { w: 1440, h: 821 };
  const DOOR = { x: 703, y: 173, w: 310, h: 537 };
  const REAL_T = 40; // thickness of the painted frame in the photo, in source px

  let g = null;
  let lastP = -1;
  let ticking = false;

  function clearInline() {
    [img, patio, patioImg, pframe, facadeCap, plaque, copy, cue].forEach((el) => el && el.removeAttribute("style"));
    if (stage) stage.style.top = "";
  }

  function measure() {
    g = null;
    if (!run || !root.classList.contains("motion")) return;
    const headH = parseFloat(getComputedStyle(root).getPropertyValue("--head-h")) || 64;
    // Phones/tablets pin the whole stage (headline + facade); desktop pins only the scene.
    const S = wide.matches ? scene : stage;
    stage.style.top = "";
    if (!wide.matches) {
      // a hero taller than the screen pins once its bottom reaches the bottom of the screen
      const over = Math.max(0, stage.offsetHeight - (window.innerHeight - headH));
      if (over > 0) stage.style.top = `${headH - over}px`;
    }
    const sr = S.getBoundingClientRect();
    const fr = ph.getBoundingClientRect();
    const rr = run.getBoundingClientRect();
    const offset = wide.matches ? copy.getBoundingClientRect().bottom - rr.top : 0;
    const pos = getComputedStyle(img).objectPosition.split(" ");
    const px = parseFloat(pos[0]) / 100;
    const py = parseFloat(pos[1] || "50") / 100;
    const s = Math.max(fr.width / SRC.w, fr.height / SRC.h);
    const ox = (fr.width - SRC.w * s) * (isNaN(px) ? 0.5 : px);
    const oy = (fr.height - SRC.h * s) * (isNaN(py) ? 0.5 : py);
    const door = { x: ox + DOOR.x * s, y: oy + DOOR.y * s, w: DOOR.w * s, h: DOOR.h * s };
    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    img.style.transformOrigin = `${cx}px ${cy}px`;
    g = {
      wide: wide.matches,
      W: S.clientWidth,
      H: S.clientHeight,
      door, cx, cy,
      fx: fr.left - sr.left,
      fy: fr.top - sr.top,
      T0: Math.max(6, REAL_T * s),
      top: parseFloat(getComputedStyle(S).top) || 0,
      offset,
      travel: Math.max(1, run.offsetHeight - offset - S.offsetHeight),
    };
    lastP = -1;
  }

  function render() {
    if (!g) return;
    const r = run.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const p = clamp((g.top - (r.top + g.offset)) / g.travel);
    if (p === lastP) return;
    lastP = p;

    const a = clamp(p / 0.9);                   // the animation; the last stretch holds the patio
    const z = 1 + 0.3 * ease(a);                // walking up to the door
    // the doorway growing: on desktop it takes the whole run; on phones it opens fast
    // so the patio and "Pasá." own most of the (short) sequence
    const t = g.wide ? ease(clamp((a - 0.04) / 0.96)) : easeOut(clamp((a - 0.03) / 0.6));
    const d = g.door;
    const dx = g.fx + g.cx + z * (d.x - g.cx);
    const dy = g.fy + g.cy + z * (d.y - g.cy);
    const T = g.T0 * lerp(z, g.wide ? 0.75 : 1.4, t);

    const x = lerp(dx, -T, t);
    const y = lerp(dy, -T, t);
    const w = lerp(d.w * z, g.W + 2 * T, t);
    const h = lerp(d.h * z, g.H + T + 2, t);

    img.style.transform = z > 1.0001 ? `scale(${z.toFixed(4)})` : "";

    pframe.style.setProperty("--t", `${T.toFixed(2)}px`);
    pframe.style.left = `${x.toFixed(2)}px`;
    pframe.style.top = `${y.toFixed(2)}px`;
    pframe.style.width = `${w.toFixed(2)}px`;
    pframe.style.height = `${h.toFixed(2)}px`;
    pframe.style.opacity = clamp(p / 0.03);

    const top = Math.max(0, y + T);
    const left = Math.max(0, x + T);
    const right = Math.max(0, g.W - (x + w - T));
    const bottom = Math.max(0, g.H - (y + h));
    patio.style.clipPath = `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px)`;
    patio.style.opacity = clamp(p / 0.05);
    patioImg.style.transform = `scale(${(1.16 - 0.16 * t).toFixed(4)})`;

    // "Pasá." arrives early and stays for most of the sequence
    const c = g.wide ? clamp((a - 0.16) / 0.14) : clamp((a - 0.2) / 0.12);
    plaque.style.opacity = c;
    plaque.style.transform = `translateY(${((1 - c) * 12).toFixed(1)}px)`;
    if (facadeCap) facadeCap.style.opacity = 1 - clamp(p / 0.1);
    if (!g.wide) copy.style.opacity = 1 - clamp((a - 0.04) / 0.16);
    if (cue) cue.style.opacity = 1 - clamp(p / 0.04);
  }

  function setMode() {
    if (!run) return;
    root.classList.toggle("motion", !reduce.matches);
    clearInline();
    measure();
    render();
  }

  function onScroll() {
    if (ticking || !g) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; render(); });
  }

  let rz;
  let lastW = window.innerWidth;
  function onResize() {
    clearTimeout(rz);
    rz = setTimeout(() => {
      // phone toolbars change the height while scrolling: only re-lay out for real size changes
      if (window.innerWidth !== lastW || !g) { lastW = window.innerWidth; clearInline(); }
      measure();
      render();
    }, 80);
  }

  if (run) {
    setMode();
    reduce.addEventListener("change", setMode);
    wide.addEventListener("change", setMode);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  }

  /* ---------------- 2. The menu ---------------- */
  const menuBtn = $("menuBtn");
  const navList = $("navList");
  if (menuBtn && navList) {
    const navWide = window.matchMedia("(min-width: 900px)");
    const native = Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");
    const isOpen = () => (native ? navList.matches(":popover-open") : navList.classList.contains("is-open"));
    const setExpanded = (open) => menuBtn.setAttribute("aria-expanded", open ? "true" : "false");

    const close = (refocus) => {
      if (!isOpen()) return;
      if (native) navList.hidePopover();
      else { navList.classList.remove("is-open"); setExpanded(false); }
      if (refocus) menuBtn.focus();
    };

    // Inline links on desktop: drop the popover there, keep it on phones and tablets
    const syncLayout = () => {
      root.classList.toggle("nav-wide", navWide.matches);
      if (navWide.matches) {
        close(false);
        navList.removeAttribute("popover");
      } else if (!navList.hasAttribute("popover")) {
        navList.setAttribute("popover", "auto");
      }
      setExpanded(false);
    };
    syncLayout();
    navWide.addEventListener("change", syncLayout);

    if (native) {
      navList.addEventListener("toggle", (e) => setExpanded(e.newState === "open"));
    } else {
      // No Popover API: the same button toggles a class, Escape closes
      menuBtn.addEventListener("click", () => {
        const open = !navList.classList.contains("is-open");
        navList.classList.toggle("is-open", open);
        setExpanded(open);
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
    }

    // Following a link closes the menu
    navList.addEventListener("click", (e) => {
      if (e.target.closest("a") && !navWide.matches) close(false);
    });
  }

  /* ---------------- 3. The staircase ---------------- */
  const stairs = $("stairs");
  const ranges = $("ranges");
  if (stairs && ranges) {
    const steps = Array.from(stairs.children);
    const buttons = Array.from(ranges.querySelectorAll(".range"));
    let pressed = null;

    const show = (btn) => {
      stairs.classList.toggle("has-sel", !!btn);
      ranges.classList.toggle("has-sel", !!pressed);
      if (!btn) { steps.forEach((s) => s.classList.remove("on")); return; }
      const from = +btn.dataset.from, to = +btn.dataset.to;
      steps.forEach((s, i) => s.classList.toggle("on", i >= from && i <= to));
    };

    buttons.forEach((b) => {
      b.addEventListener("click", () => {
        pressed = pressed === b ? null : b;
        buttons.forEach((x) => x.setAttribute("aria-pressed", x === pressed ? "true" : "false"));
        show(pressed);
      });
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !pressed) show(b); });
      b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") show(pressed); });
    });
  }
})();
