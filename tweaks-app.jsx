/* Tweaks app — mounts the Tweaks panel and applies tweaks to the document root */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "displayFont": "serif",
  "motion": true,
  "heroAccent": "#CF142B"
}/*EDITMODE-END*/;

function TweaksApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-font", t.displayFont === "sans" ? "sans" : "serif");
    root.setAttribute("data-motion", t.motion ? "on" : "off");
    root.style.setProperty("--red", t.heroAccent);
    const deep = {
      "#CF142B": "#A80F22",
      "#B3122A": "#8E0E21",
      "#E0252F": "#B81C26"
    }[t.heroAccent] || "#A80F22";
    root.style.setProperty("--red-deep", deep);
  }, [t]);

  return (
    <TweaksPanel>
      <TweakSection label="Tipografía" />
      <TweakRadio
        label="Titulares"
        value={t.displayFont}
        options={["serif", "sans"]}
        onChange={(v) => setTweak("displayFont", v)}
      />
      <TweakSection label="Color" />
      <TweakColor
        label="Rojo de acento"
        value={t.heroAccent}
        options={["#CF142B", "#B3122A", "#E0252F"]}
        onChange={(v) => setTweak("heroAccent", v)}
      />
      <TweakSection label="Movimiento" />
      <TweakToggle
        label="Animaciones"
        value={t.motion}
        onChange={(v) => setTweak("motion", v)}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<TweaksApp />);
