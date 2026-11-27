/* Hero variant 2 · "El globo" — header colour, load moment, parallax */
(() => {
  "use strict";

  const hero = document.getElementById("inicio");
  const top = document.getElementById("top");
  if (!hero || !top) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: blue while the poster is under it, white once it has gone by. */
  let headTick = false;
  const headState = () => {
    headTick = false;
    top.classList.toggle("h2-past", hero.getBoundingClientRect().bottom <= top.offsetHeight + 1);
  };
  addEventListener("scroll", () => { if (!headTick) { headTick = true; requestAnimationFrame(headState); } }, { passive: true });
  addEventListener("resize", headState, { passive: true });
  headState();

  /* Load moment: CSS plays it while .h2-intro is on; a timer always takes it
     off, so every element ends in its resting CSS state whatever happened. */
  if (!reduce && !document.hidden && hero.getBoundingClientRect().top < innerHeight) {
    hero.classList.add("h2-intro");
    const end = () => hero.classList.remove("h2-intro");
    setTimeout(end, 2000);
    document.addEventListener("visibilitychange", () => { if (document.hidden) end(); });
  }

  /* Desktop parallax: the disc, the photo and the stamp drift apart a little
     with the pointer and with scroll. Uses `translate`, so it never fights the
     load animation's `transform`. */
  const fine = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
  if (reduce) return;
  const layers = [
    { el: hero.querySelector(".h2-disc"), d: 26, s: 0.1 },
    { el: hero.querySelector(".h2-frame"), d: 12, s: 0.04 },
    { el: hero.querySelector(".h2-tag"), d: 14, s: 0.04 },
    { el: hero.querySelector(".h2-stamp"), d: 20, s: -0.06 },
    { el: hero.querySelector(".h2-say"), d: -7, s: -0.02 },
  ].filter((l) => l.el);

  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const frame = () => {
    raf = 0;
    x += (tx - x) * 0.09;
    y += (ty - y) * 0.09;
    const sy = Math.min(Math.max(scrollY, 0), hero.offsetHeight);
    layers.forEach((l) => {
      l.el.style.translate = `${(x * l.d).toFixed(2)}px ${(y * l.d + sy * l.s).toFixed(2)}px`;
    });
    if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const onMove = (e) => {
    if (!fine.matches) return;
    const r = hero.getBoundingClientRect();
    if (r.bottom < 0) return;
    tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    kick();
  };
  addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  addEventListener("scroll", () => { if (fine.matches && scrollY < hero.offsetHeight + 200) kick(); }, { passive: true });
  fine.addEventListener("change", () => {
    if (!fine.matches) { tx = ty = x = y = 0; layers.forEach((l) => { l.el.style.translate = ""; }); }
  });
})();
