const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "color",
  "lefty": false,
  "wobble": "medium"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Tune wobble strength globally
  React.useEffect(() => {
    const f = document.querySelector("#wobble feDisplacementMap");
    if (!f) return;
    const v = t.wobble === "off" ? 0 : t.wobble === "low" ? 0.7 : t.wobble === "high" ? 2.4 : 1.4;
    f.setAttribute("scale", v);
  }, [t.wobble]);

  const aprops = { palette: t.palette, lefty: t.lefty };

  return (
    <>
      <DesignCanvas>
        <DCSection
          id="stage1"
          title="Stage 1 — Foundation"
          subtitle="Five shells for the global key center. All low-fi; the goal is structure, not polish."
        >
          <DCArtboard id="a" label="A · Centered hero" width={680} height={820}>
            <ApproachA {...aprops} />
          </DCArtboard>
          <DCArtboard id="b" label="B · Pinned sidebar" width={760} height={820}>
            <ApproachB {...aprops} />
          </DCArtboard>
          <DCArtboard id="c" label="C · Sticky top bar" width={760} height={820}>
            <ApproachC {...aprops} />
          </DCArtboard>
          <DCArtboard id="d" label="D · Two-pane split" width={760} height={820}>
            <ApproachD {...aprops} />
          </DCArtboard>
          <DCArtboard id="e" label="E · Circle-of-5ths dial" width={760} height={820}>
            <ApproachE {...aprops} />
          </DCArtboard>
        </DCSection>

        <DCSection
          id="notes"
          title="Stage 1 constraints — quick reference"
          subtitle="Pinned for context while comparing shells."
        >
          <DCArtboard id="constraints" label="Non-negotiables" width={680} height={420}>
            <div className="wf wf-paper" style={{ width:"100%", height:"100%", padding: 18, display:"flex", flexDirection:"column", gap: 10 }}>
              <div className="wf-arch" style={{ fontSize: 20 }}>What every shell must support</div>
              <div className="spec-grid">
                <div><b>state</b> single global key center (tonic + scale)</div>
                <div><b>theory</b> Tonal.js — no hand-rolled lookups</div>
                <div><b>spelling</b> F♯ major → E♯ (not F)</div>
                <div><b>roman</b> i / ii / III°  ø  b♭ #♯</div>
                <div><b>color</b> redundant w/ shape + label</div>
                <div><b>palette</b> Okabe-Ito · max 4–5 hues</div>
                <div><b>fretboard</b> 12 / 15 / 22 fret modes</div>
                <div><b>lefty</b> toggle, persists</div>
                <div><b>contrast</b> WCAG AA on paper bg</div>
                <div><b>print</b> clean monochrome export</div>
                <div><b>storage</b> UI prefs only · no accounts</div>
                <div><b>audio</b> none in v1</div>
              </div>
              <div className="stickynote" style={{ alignSelf:"flex-start", marginTop: "auto" }}>
                root = filled square ▪<br/>3rd 5th 7th = filled circles ●<br/>scale tones = open circles ○
              </div>
            </div>
          </DCArtboard>

          <DCArtboard id="legend" label="Marker legend" width={420} height={420}>
            <div className="wf wf-paper" style={{ width:"100%", height:"100%", padding: 18, display:"flex", flexDirection:"column", gap: 12 }}>
              <div className="wf-arch" style={{ fontSize: 20 }}>Marker language</div>
              <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
                {[
                  ["root","▪","var(--accent-root)","#fff","filled SQUARE — also distinct shape"],
                  ["3rd","●","var(--accent-3)","#fff","filled circle"],
                  ["5th","●","var(--accent-5)","#fff","filled circle"],
                  ["7th","●","var(--accent-7)","#1a1816","filled circle"],
                  ["other","○","var(--paper)","var(--ink)","open circle, note name only"],
                ].map(([n,g,bg,fg,note]) => (
                  <div key={n} style={{ display:"flex", alignItems:"center", gap: 10 }}>
                    <span style={{ width: 28, height: 28, display:"inline-flex", alignItems:"center", justifyContent:"center",
                                   background: bg, color: fg, border:"1.4px solid var(--line)",
                                   borderRadius: n === "root" ? 4 : "50%", fontWeight: 700 }}>{n === "root" ? "R" : ""}</span>
                    <div>
                      <div className="wf-hand" style={{ fontSize: 18, lineHeight: 1 }}>{n}</div>
                      <div className="wf-mono" style={{ fontSize: 10, color:"var(--ink-3)" }}>{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Wireframe knobs" />
        <TweakRadio label="Palette" value={t.palette}
                    options={["color","mono"]}
                    onChange={(v) => setTweak("palette", v)} />
        <TweakToggle label="Lefty fretboard" value={t.lefty}
                     onChange={(v) => setTweak("lefty", v)} />
        <TweakRadio label="Sketchiness" value={t.wobble}
                    options={["off","low","medium","high"]}
                    onChange={(v) => setTweak("wobble", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
