/* fretwise · foundation — Stage 1–5.
   All theory derived from window.Theory (Tonal.js wrapper). */

const { pretty } = window.Theory;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

const TONICS = [
  { id: "C",  letter: "C",  acc: null },
  { id: "Db", letter: "D",  acc: "♭"  },
  { id: "D",  letter: "D",  acc: null },
  { id: "Eb", letter: "E",  acc: "♭"  },
  { id: "E",  letter: "E",  acc: null },
  { id: "F",  letter: "F",  acc: null },
  { id: "F#", letter: "F",  acc: "♯"  },
  { id: "G",  letter: "G",  acc: null },
  { id: "Ab", letter: "A",  acc: "♭"  },
  { id: "A",  letter: "A",  acc: null },
  { id: "Bb", letter: "B",  acc: "♭"  },
  { id: "B",  letter: "B",  acc: null },
];

const SCALES = [
  { id: "major",      label: "major",         alias: "ionian"  },
  { id: "minor",      label: "minor",         alias: "aeolian" },
  { id: "dorian",     label: "dorian"      },
  { id: "phrygian",   label: "phrygian"    },
  { id: "lydian",     label: "lydian"      },
  { id: "mixolydian", label: "mixolydian"  },
  { id: "locrian",    label: "locrian"     },
  { id: "harm-minor", label: "harmonic min" },
  { id: "mel-minor",  label: "melodic min"  },
  { id: "maj-pent",   label: "major pent"   },
  { id: "min-pent",   label: "minor pent"   },
  { id: "blues",      label: "blues"        },
];

const STORAGE_KEY = "fretwise:foundation:v1";

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writePrefs(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

/* Deep-linkable state: encode key/scale/scheme/theme in the URL hash so a view
   can be bookmarked and shared. Hash wins over saved prefs on load. */
function readHash() {
  try {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h) return {};
    const p = new URLSearchParams(h);
    const out = {};
    if (p.get("key"))    out.tonic  = p.get("key");
    if (p.get("scale"))  out.scale  = p.get("scale");
    if (p.get("scheme")) out.scheme = p.get("scheme");
    if (p.get("theme"))  out.theme  = p.get("theme");
    return out;
  } catch { return {}; }
}
function writeHash({ tonic, scale, scheme, theme }) {
  try {
    const p = new URLSearchParams();
    p.set("key", tonic);
    p.set("scale", scale);
    p.set("scheme", scheme);
    p.set("theme", theme);
    const next = "#" + p.toString();
    if (next !== location.hash) {
      history.replaceState(null, "", next);
    }
  } catch {}
}

/* Glyph-scramble: on value change, flash a couple of random note glyphs before
   settling. Purposeful (tied to a state change), reduced-motion-safe. */
function ScrambleText({ value, className }) {
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); return; }
    const glyphs = "ABCDEFG".split("");
    let i = 0;
    const steps = 3;
    const id = setInterval(() => {
      i++;
      if (i >= steps) { clearInterval(id); setDisplay(value); }
      else setDisplay(glyphs[Math.floor(Math.random() * glyphs.length)]);
    }, 48);
    return () => clearInterval(id);
  }, [value]);
  return <span className={className}>{display}</span>;
}

/* Small "what am I looking at" explainer toggled from the fretboard legend. */
function FretboardHelp() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        className="legend-help-btn"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title="What am I looking at?">
        {open ? "× hide" : "? what am I looking at"}
      </button>
      {open && (
        <div className="legend-help">
          Each dot is a note in the current key, placed where you'd fret it. The
          <b> root</b> is the note the key is named after; the <b>3rd</b>, <b>5th</b>,
          and <b>7th</b> are the chord tones built on top of it — they're what give a
          chord its color. Dots without a color are the remaining scale tones. Click any
          chord above to spotlight just its tones on the board.
        </div>
      )}
    </>
  );
}

function tonicEntryFor(noteName) {
  if (!noteName) return TONICS[0];
  const hit = TONICS.find(t => t.id === noteName);
  if (hit) return hit;
  const enh = window.Theory.enharmonic(noteName);
  return TONICS.find(t => t.id === enh) || TONICS[0];
}

function scaleEntryFor(scaleId) {
  return SCALES.find(s => s.id === scaleId) || SCALES[0];
}

// ============== KeyCard ==============
function KeyCard({ keyInfo, onSwapTo, palette }) {
  const { notes, degrees, intervals, parallel, relative, parentMajor, family } = keyInfo;
  const isMode = parentMajor !== keyInfo.scale.tonic;

  const intervalRole = (intv) => window.Theory.intervalToRole(intv);

  return (
    <section className="keycard">
      <div className="keycard-notes">
        <div className="lbl">
          notes
          <span className="lbl-tag">· {family} family</span>
          {isMode && (
            <span className="lbl-tag">· parent {pretty(parentMajor)} major</span>
          )}
        </div>
        <div className="notes-grid">
          {notes.map((n, i) => {
            const role = intervalRole(intervals[i]);
            return (
              <div key={i} className="note-cell"
                   data-role={palette === "color" ? role : "neutral"}>
                <div className="degree">{degrees[i]}</div>
                <div className="note">{pretty(n)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="keycard-cell clickable"
              onClick={() => onSwapTo(parallel.tonic, parallel.scaleId)}
              title={`Switch to ${parallel.label}`}>
        <div className="lbl">parallel</div>
        <div className="val">{parallel.label}</div>
        <div className="sub sub-cta">same tonic · opposite quality →</div>
      </button>

      <button className="keycard-cell clickable"
              onClick={() => onSwapTo(relative.tonic, relative.scaleId)}
              title={`Switch to ${relative.label}`}>
        <div className="lbl">relative</div>
        <div className="val">{relative.label}</div>
        <div className="sub sub-cta">shares key signature →</div>
      </button>
    </section>
  );
}

// ============== DiatonicHarmony ==============
function DiatonicHarmony({ chords, sevenths, onToggleSevenths, chordIdx, onChordFocus, onClearFocus, family }) {
  const [open, setOpen] = window.useCollapse("diatonic", true, [".harmony"]);

  if (!chords) {
    return (
      <section className="harmony" data-open={open ? "true" : "false"}>
        <div className="panel-head">
          <div className="panel-title">
            <window.CollapseBtn open={open} onToggle={() => setOpen(!open)} label="diatonic chords" />
            diatonic harmony
          </div>
        </div>
        {open && (
          <div className="empty-state">
            <div className="empty-hand">—</div>
            <div className="empty-msg">
              diatonic chords are only built for seven-note scales.
              <br/>switch to a heptatonic scale (major, minor, modes, harmonic min, melodic min) to see triads.
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="harmony" data-open={open ? "true" : "false"}>
      <div className="panel-head">
        <div className="panel-title">
          <window.CollapseBtn open={open} onToggle={() => setOpen(!open)} label="diatonic chords" />
          diatonic chords · <b>{family === "major" ? "major family" : "minor family"}</b>
        </div>
        {open && (
          <div className="panel-controls">
            <div className="seg" role="radiogroup" aria-label="Chord size">
              <button aria-pressed={!sevenths} onClick={() => onToggleSevenths(false)}>triads</button>
              <button aria-pressed={sevenths}  onClick={() => onToggleSevenths(true)}>7ths</button>
            </div>
            {chordIdx != null && (
              <button className="iconbtn" onClick={onClearFocus} title="Back to scale view">
                <span className="glyph">✕</span><span>clear focus</span>
              </button>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="chord-row">
          {chords.map((c, i) => {
            const active = chordIdx === i;
            return (
              <button key={i}
                className={"chord-card" + (active ? " active" : "")}
                onClick={() => onChordFocus(i)}
                aria-pressed={active}
                title={`Show ${c.name} on the fretboard`}>
                <div className="chord-roman">{c.roman}</div>
                <div className="chord-name">{c.name}</div>
                <div className="chord-notes">
                  {c.notes.map((n, j) => (
                    <span key={j} className={"chord-note role-" + (j === 0 ? "root" : j === 1 ? "t3" : j === 2 ? "t5" : "t7")}>
                      {pretty(n)}
                    </span>
                  ))}
                </div>
                <div className="chord-fn" data-fn={c.degreeName}>
                  {c.degreeName}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============== Tweak defaults — authoring knobs ==============
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "defaultTheme":    "light",
  "defaultScheme":   "neon",
  "showSchemesFab":  true,
  "compactSpacing":  false
}/*EDITMODE-END*/;

// ============== App ==============
function App() {
  const saved = { ...(readPrefs() || {}), ...readHash() };
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [theme, setTheme]       = React.useState(saved.theme   || t.defaultTheme);
  const [scheme, setScheme]     = React.useState(saved.scheme  || t.defaultScheme);
  const [tonic, setTonicState]  = React.useState(saved.tonic   || "C");
  const [scale, setScaleState]  = React.useState(saved.scale   || "major");
  const [lefty, setLefty]       = React.useState(!!saved.lefty);
  const [frets, setFrets]       = React.useState(saved.frets   || 12);
  const [palette, setPalette]   = React.useState(saved.palette || "color");
  const [sevenths, setSevenths] = React.useState(!!saved.sevenths);
  const [chordIdx, setChordIdx] = React.useState(null);
  const [borrowedFocus, setBorrowedFocus] = React.useState(null);
  const [voicing, setVoicing]   = React.useState(null);
  const [voicingKey, setVoicingKey] = React.useState(null);
  const [cagedShape, setCagedShape] = React.useState(null);

  // Stage 5 — voicings panel state
  const [voicingsTab, setVoicingsTab] = React.useState(saved.voicingsTab || "triads");
  const [activeExtensions, setActiveExtensions] = React.useState([]);

  // Stage 5.1 — drag-to-reorder the lower three panels
  const DEFAULT_PANEL_ORDER = ["interchange", "circle", "practice"];
  const [panelOrder, setPanelOrder] = React.useState(() => {
    const arr = saved.panelOrder;
    if (!Array.isArray(arr)) return DEFAULT_PANEL_ORDER;
    const set = new Set(arr);
    const valid = set.size === DEFAULT_PANEL_ORDER.length
      && DEFAULT_PANEL_ORDER.every(id => set.has(id));
    return valid ? arr : DEFAULT_PANEL_ORDER;
  });

  // Hooks must run unconditionally — call one per stable panel id at top level.
  const reorderInterchange = window.useReorderable("interchange", panelOrder, setPanelOrder);
  const reorderCircle      = window.useReorderable("circle",      panelOrder, setPanelOrder);
  const reorderPractice    = window.useReorderable("practice",    panelOrder, setPanelOrder);
  const reorderByPanel = {
    interchange: reorderInterchange,
    circle:      reorderCircle,
    practice:    reorderPractice,
  };

  // Bridge author tweaks → runtime state. Only fire AFTER first render so the
  // end user's saved prefs aren't overridden on mount.
  const themeFirstRun = React.useRef(true);
  React.useEffect(() => {
    if (themeFirstRun.current) { themeFirstRun.current = false; return; }
    setTheme(t.defaultTheme);
  }, [t.defaultTheme]);
  const schemeFirstRun = React.useRef(true);
  React.useEffect(() => {
    if (schemeFirstRun.current) { schemeFirstRun.current = false; return; }
    setScheme(t.defaultScheme);
  }, [t.defaultScheme]);

  // Reset all focus state when tonic / scale change.
  React.useEffect(() => {
    setChordIdx(null);
    setBorrowedFocus(null);
    setVoicing(null);
    setVoicingKey(null);
    setCagedShape(null);
    setActiveExtensions([]);
  }, [tonic, scale]);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-scheme", scheme);
    document.documentElement.setAttribute("data-density", t.compactSpacing ? "compact" : "regular");
  }, [theme, scheme, t.compactSpacing]);

  React.useEffect(() => {
    writePrefs({ theme, tonic, scale, lefty, frets, palette, scheme, sevenths, voicingsTab, panelOrder });
    writeHash({ tonic, scale, scheme, theme });
  }, [theme, tonic, scale, lefty, frets, palette, scheme, sevenths, voicingsTab, panelOrder]);

  const swapTo = React.useCallback((newTonic, newScale) => {
    const entry = tonicEntryFor(newTonic);
    setTonicState(entry.id);
    if (newScale) setScaleState(newScale);
  }, []);

  const currentTonic = tonicEntryFor(tonic);
  const currentScale = scaleEntryFor(scale);

  const keyInfo = React.useMemo(
    () => window.Theory.getKeyInfo(currentTonic.id, currentScale.id),
    [currentTonic.id, currentScale.id]
  );

  const scaleMarkers = React.useMemo(
    () => window.Theory.fretboardMarkers(currentTonic.id, currentScale.id, frets),
    [currentTonic.id, currentScale.id, frets]
  );

  const chords = React.useMemo(
    () => window.Theory.getDiatonicChords(currentTonic.id, currentScale.id, sevenths),
    [currentTonic.id, currentScale.id, sevenths]
  );

  // Focus order: borrowed chord > diatonic chord > none.
  const focusedChord =
    borrowedFocus
      ? borrowedFocus
      : (chordIdx != null && chords ? chords[chordIdx] : null);

  const focusedKey = focusedChord ? `${focusedChord.name}|${focusedChord.roman}` : "";
  React.useEffect(() => {
    setVoicing(null);
    setVoicingKey(null);
    setActiveExtensions([]);
  }, [focusedKey]);

  // Promote the focused chord to its 7th version (for the 7ths + extensions tabs).
  const focusedSevenChord = React.useMemo(() => {
    if (!focusedChord) return null;
    const Th = window.Theory;
    const baseQ = Th.promoteToSeventh(focusedChord.quality);
    const seventh = focusedChord.seventh
      || window.Tonal.Note.transpose(focusedChord.root, Th.seventhIntervalFor(focusedChord.quality));
    return {
      ...focusedChord,
      quality: baseQ,
      seventh,
      notes: [focusedChord.root, focusedChord.third, focusedChord.fifth, seventh],
      name: Th.pretty(focusedChord.root) + Th.baseSymbolFor(baseQ),
    };
  }, [focusedChord]);

  const extendedObj = React.useMemo(() => {
    if (voicingsTab !== "extensions") return null;
    if (!focusedSevenChord) return null;
    if (activeExtensions.length === 0) return null;
    return window.Theory.extendChord(focusedSevenChord, activeExtensions);
  }, [voicingsTab, focusedSevenChord, activeExtensions]);

  const cagedMarkers = React.useMemo(() => {
    if (!cagedShape) return null;
    return window.Theory.getCAGEDMarkers(currentTonic.id, currentScale.id, cagedShape, frets);
  }, [cagedShape, currentTonic.id, currentScale.id, frets]);

  const cagedWindow = React.useMemo(() => {
    if (!cagedShape) return null;
    return window.Theory.cagedWindowFor(currentTonic.id, cagedShape);
  }, [cagedShape, currentTonic.id]);

  // Markers priority:
  //   pinned voicing > extension overlay > focused (7th or triad) > CAGED > scale
  const markers = React.useMemo(() => {
    if (voicing) {
      return voicing.positions.map(p => ({
        s: p.s, f: p.f, label: window.Theory.pretty(p.note), kind: p.role,
      }));
    }
    if (extendedObj) {
      return window.Theory.extendedChordFretboardMarkers(extendedObj, frets);
    }
    if (focusedChord) {
      const useChord =
        (voicingsTab === "7ths" || voicingsTab === "extensions") && focusedSevenChord
          ? focusedSevenChord
          : focusedChord;
      return window.Theory.chordFretboardMarkers(useChord.notes, frets);
    }
    if (cagedMarkers) return cagedMarkers;
    return scaleMarkers;
  }, [voicing, extendedObj, focusedChord, focusedSevenChord, voicingsTab, cagedMarkers, scaleMarkers, frets]);

  // Focus-action handlers
  const focusDiatonic = React.useCallback((i) => {
    setBorrowedFocus(null);
    setCagedShape(null);
    setChordIdx(i);
  }, []);
  const focusBorrowed = React.useCallback((c) => {
    setChordIdx(null);
    setCagedShape(null);
    setBorrowedFocus(c);
  }, []);
  const focusCAGED = React.useCallback((shapeId) => {
    setChordIdx(null);
    setBorrowedFocus(null);
    setVoicing(null);
    setVoicingKey(null);
    setCagedShape(shapeId);
  }, []);
  const clearFocus = React.useCallback(() => {
    setChordIdx(null);
    setBorrowedFocus(null);
    setVoicing(null);
    setVoicingKey(null);
    setCagedShape(null);
    setActiveExtensions([]);
  }, []);
  const selectVoicing = React.useCallback((v, key) => {
    setVoicing(v);
    setVoicingKey(key);
  }, []);
  const clearVoicing = React.useCallback(() => {
    setVoicing(null);
    setVoicingKey(null);
  }, []);

  const jumpTo = React.useCallback((selector) => {
    if (!selector) return;
    // Ask any matching collapsible panel to expand itself before we measure
    // and scroll. We then defer the scroll until React has flushed the
    // resulting re-render (two rAFs = one for commit, one for paint).
    window.dispatchEvent(new CustomEvent("fretwise:open-section", {
      detail: { selector },
    }));
    const doScroll = () => {
      const el = document.querySelector(selector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      window.scrollTo({
        top: rect.top + window.scrollY - 64,
        behavior: "smooth",
      });
      el.classList.remove("jump-flash");
      void el.offsetWidth;
      el.classList.add("jump-flash");
      window.setTimeout(() => el.classList.remove("jump-flash"), 1400);
    };
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  }, []);

  const extensionsActive = !!extendedObj;

  return (
    <div className="shell">
      <div className="frame">

        <div className="mobile-note" role="note">
          Fretboard Codex is best viewed in landscape or on a larger screen.
        </div>

        {/* ============== TOP BAR ============== */}
        <header className="topbar">
          <div className="brand-col">
            <div className="brand">
              <span className="brand-logo">
                <LogoMark className="brand-mark" />
                <span className="brand-logo-sweep" aria-hidden="true"></span>
              </span>
              <span className="mark">fretboard codex</span>
              <span className="tag">guitar theory interface</span>
            </div>
            <p className="brand-tagline">Scales, modes, chords, voicings, and modal interchange mapped live on an interactive fretboard.</p>
          </div>
          <div className="topbar-right">
            <button
              className="iconbtn"
              aria-pressed={theme === "dark"}
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Switch to dark" : "Switch to light"}
            >
              <span className="glyph">{theme === "light" ? "☼" : "☾"}</span>
              <span>{theme === "light" ? "light" : "dark"}</span>
            </button>
          </div>
        </header>

        {/* ============== HERO ============== */}
        <section className="hero">
          <div className="hero-eyebrow">
            <span className="tick"></span>
            <span>selected key</span>
            <span className="tick"></span>
          </div>
          <div className="tonic-display">
            <span className="reticle tl"></span>
            <span className="reticle tr"></span>
            <span className="reticle bl"></span>
            <span className="reticle br"></span>
            <span className="tonic-letter">
              <ScrambleText value={currentTonic.letter} />
              {currentTonic.acc && <span className="tonic-accidental">{currentTonic.acc}</span>}
            </span>
            <span className="tonic-scale">{currentScale.label}</span>
          </div>

          <div className="tonic-row" role="radiogroup" aria-label="Tonic">
            {TONICS.map((tn, i) => (
              <button key={tn.id}
                      className="tonic-cell"
                      role="radio"
                      aria-selected={tn.id === tonic}
                      aria-checked={tn.id === tonic}
                      onClick={() => setTonicState(tn.id)}>
                <span className="idx-num">{String(i+1).padStart(2,"0")}</span>
                {tn.letter}{tn.acc && <span className="accidental">{tn.acc}</span>}
              </button>
            ))}
          </div>

          <div className="scale-row" role="radiogroup" aria-label="Scale">
            {SCALES.map(s => (
              <button key={s.id}
                      className="scale-chip"
                      role="radio"
                      aria-selected={s.id === scale}
                      aria-checked={s.id === scale}
                      onClick={() => setScaleState(s.id)}
                      title={s.alias ? `aka ${s.alias}` : undefined}>
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* ============== KEY CARD (Stage 2 F1) ============== */}
        <KeyCard keyInfo={keyInfo} onSwapTo={swapTo} palette={palette} />

        {/* ============== DIATONIC HARMONY (Stage 2 F2) — moved up ============== */}
        <DiatonicHarmony
          chords={chords}
          sevenths={sevenths}
          onToggleSevenths={setSevenths}
          chordIdx={chordIdx}
          onChordFocus={focusDiatonic}
          onClearFocus={clearFocus}
          family={keyInfo.family}
        />

        {/* ============== FRETBOARD ============== */}
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              fretboard · <b>{currentTonic.letter}{currentTonic.acc || ""} {currentScale.label}</b>
              {focusedChord && (
                <span className="focus-tag"> → focused on <b>{focusedChord.name}</b> ({focusedChord.roman})</span>
              )}
              {voicing && (
                <span className="focus-tag"> · <b>{voicing.stringSet}</b> · <b>{voicing.inversion} inv</b></span>
              )}
              {extensionsActive && (
                <span className="focus-tag"> · extended to <b>{extendedObj.name}</b></span>
              )}
              {cagedShape && !focusedChord && cagedWindow && (
                <span className="focus-tag"> → CAGED <b>{cagedShape}-shape</b> · frets <b>{cagedWindow.lo}–{cagedWindow.hi}</b></span>
              )}
            </div>
            <div className="panel-controls">
              <div className="seg" role="radiogroup" aria-label="Fret count">
                {[12, 15, 22].map(n => (
                  <button key={n} aria-pressed={frets === n}
                          onClick={() => setFrets(n)}>{n} fr</button>
                ))}
              </div>
              <button className="iconbtn"
                      aria-pressed={lefty}
                      onClick={() => setLefty(!lefty)}
                      title="Mirror for left-handed">
                <span className="glyph">↺</span>
                <span>lefty</span>
              </button>
              <button className="iconbtn"
                      aria-pressed={palette === "mono"}
                      onClick={() => setPalette(palette === "color" ? "mono" : "color")}
                      title="Monochrome (colorblind-safe shapes only)">
                <span className="glyph">◐</span>
                <span>mono</span>
              </button>
            </div>
          </div>

          <div className="caged-row">
            <span className="caged-row-lbl">// caged shape</span>
            <div className="seg caged-seg">
              {window.Theory.CAGED_SHAPE_ORDER.map(id => (
                <button key={id}
                        aria-pressed={cagedShape === id}
                        disabled={!chords}
                        onClick={() => focusCAGED(cagedShape === id ? null : id)}
                        title={chords
                          ? `Show the ${id}-shape of ${currentTonic.letter}${currentTonic.acc || ""} on the fretboard`
                          : "Switch to a 7-note scale to use CAGED"}>
                  {id}
                </button>
              ))}
            </div>
            {!chords && (
              <span className="caged-row-note micro muted">requires a 7-note scale</span>
            )}
            {cagedShape && (
              <span className="caged-row-note micro muted">
                I-chord tones colored · other scale notes outlined
              </span>
            )}
          </div>

          <div className="panel-body">
            <Fretboard frets={frets} lefty={lefty} palette={palette} markers={markers} />
          </div>

          <div className="legend">
            <span className="item"><span className="swatch root"></span>root ▪</span>
            <span className="item"><span className="swatch t3"></span>3rd</span>
            <span className="item"><span className="swatch t5"></span>5th</span>
            <span className="item"><span className="swatch t7"></span>7th</span>
            {extensionsActive && (
              <span className="item"><span className="swatch ext"></span>extension</span>
            )}
            {!focusedChord && !cagedShape && !extensionsActive && (
              <span className="item"><span className="swatch n"></span>other scale tone</span>
            )}
            <span style={{ marginLeft: "auto", color: "var(--ink-4)" }}>
              {voicing
                ? <>showing one voicing · <button className="linkbtn" onClick={clearVoicing}>show all positions</button></>
                : extensionsActive
                ? <>extended chord overlay · <button className="linkbtn" onClick={() => setActiveExtensions([])}>clear tensions</button></>
                : focusedChord
                ? <>showing chord tones only · <button className="linkbtn" onClick={clearFocus}>back to scale</button></>
                : cagedShape
                ? <>showing {cagedShape}-shape window · <button className="linkbtn" onClick={clearFocus}>back to full scale</button></>
                : "shape + label always present · color is redundant"}
            </span>
            <FretboardHelp />
          </div>
        </section>

        {/* ============== VOICINGS (Stage 3 F5 + Stage 5 — tabs) ============== */}
        {focusedChord && (
          <VoicingsPanel
            chord={focusedChord}
            palette={palette}
            frets={frets}
            voicingsTab={voicingsTab}
            setVoicingsTab={setVoicingsTab}
            selectedVoicingKey={voicingKey}
            onSelectVoicing={selectVoicing}
            onClear={clearVoicing}
            activeExtensions={activeExtensions}
            setActiveExtensions={setActiveExtensions}
          />
        )}

        {/* ============== REORDERABLE LOWER PANELS ============== */}
        {panelOrder.map(panelId => {
          const reorder = reorderByPanel[panelId];
          if (!reorder) return null;
          const handle = <window.DragHandle handleProps={reorder.handleProps} label={panelId} />;
          if (panelId === "interchange") {
            return (
              <ModalInterchange
                key="interchange"
                tonic={currentTonic.id}
                scale={currentScale.id}
                family={keyInfo.family}
                palette={palette}
                frets={frets}
                onFocusChord={focusBorrowed}
                sectionProps={reorder.sectionProps}
                dragHandle={handle}
              />
            );
          }
          if (panelId === "circle") {
            return (
              <CircleOfFifths
                key="circle"
                tonic={currentTonic.id}
                scale={currentScale.id}
                family={keyInfo.family}
                palette={palette}
                onSwapTo={swapTo}
                sectionProps={reorder.sectionProps}
                dragHandle={handle}
              />
            );
          }
          if (panelId === "practice") {
            return (
              <PracticeSession
                key="practice"
                tonic={currentTonic.id}
                scale={currentScale.id}
                keyInfo={keyInfo}
                onJump={jumpTo}
                sectionProps={reorder.sectionProps}
                dragHandle={handle}
              />
            );
          }
          return null;
        })}

        {/* ============== FOOTER (minimal) ============== */}
        <footer className="footer">
          <span className="codex-mark codex-mark--by">
            created by <a href="https://afterosmosis.com" target="_blank" rel="noopener noreferrer">afterosmosis</a>
            <span className="codex-mark__sep">//</span>
            <a href="https://buymeacoffee.com/afterosmosis" target="_blank" rel="noopener noreferrer">buymeacoffee</a>
          </span>
          <ShareRow />
          <span className="codex-mark">fretboardcodex.com</span>
        </footer>
      </div>

      {t.showSchemesFab && (
        <ColorSchemeFab scheme={scheme} setScheme={setScheme} theme={theme} setTheme={setTheme} />
      )}

      <TweaksPanel>
        <TweakSection label="Theme defaults" />
        <TweakRadio label="Default theme" value={t.defaultTheme}
                    options={["light", "dark"]}
                    onChange={(v) => setTweak("defaultTheme", v)} />
        <TweakRadio label="Default palette" value={t.defaultScheme}
                    options={["neon", "synth", "console", "rebel", "rust", "hazard", "verdigris", "phosphor"]}
                    onChange={(v) => setTweak("defaultScheme", v)} />
        <TweakSection label="UI" />
        <TweakToggle label="Show palette FAB for end users" value={t.showSchemesFab}
                     onChange={(v) => setTweak("showSchemesFab", v)} />
        <TweakToggle label="Compact spacing" value={t.compactSpacing}
                     onChange={(v) => setTweak("compactSpacing", v)} />
      </TweaksPanel>
    </div>
  );
}

// ============== ShareRow ==============
// Small, non-obtrusive share links for the footer. Text-only, matches the
// footer's mono/uppercase "codex-mark" styling rather than icon artwork.
function ShareRow() {
  const [copied, setCopied] = React.useState(false);
  const url = "https://fretboardcodex.com";
  const text = "Fretboard Codex \u2014 guitar scales, modes, voicings & modal interchange, mapped live on an interactive fretboard.";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      // clipboard API unavailable (e.g. insecure context) — silently no-op
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span className="codex-mark share-row">
      share
      <span className="codex-mark__sep">//</span>
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
         target="_blank" rel="noopener noreferrer">twitter</a>
      <a href={`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`}
         target="_blank" rel="noopener noreferrer">reddit</a>
      <button type="button" className="share-copy" onClick={copyLink}>
        {copied ? "copied" : "copylink"}
      </button>
    </span>
  );
}

// ============== ColorSchemeFab ==============
// End-user-facing floating palette switcher.
const SCHEMES = [
  { id: "neon",      name: "neon circuit",  sub: "black · logo cyan",              swatch: ["#eef6f7", "#32e0d8", "#0f1720"] },
  { id: "synth",     name: "synth grid",    sub: "violet · hot magenta",           swatch: ["#f3e9f5", "#e0299b", "#231a30"] },
  { id: "console",   name: "console amber", sub: "charcoal · CRT amber",          swatch: ["#1f2226", "#e1a838", "#3a3f47"] },
  { id: "rebel",     name: "rebel base",    sub: "warm sand · burnt orange",     swatch: ["#e7dccb", "#cf6a32", "#2b2520"] },
  { id: "rust",      name: "rust + bone",   sub: "bone · iron oxide",              swatch: ["#ecdfd0", "#9c3a2b", "#2a221e"] },
  { id: "hazard",    name: "hazard",        sub: "concrete · radiation yellow",    swatch: ["#d6d2c4", "#d8c530", "#272622"] },
  { id: "verdigris", name: "verdigris",     sub: "steel · oxidized copper",        swatch: ["#dde2e4", "#3aa088", "#2b3540"] },
  { id: "phosphor",  name: "phosphor",      sub: "dark olive · CRT green",         swatch: ["#1a1f1a", "#7fd673", "#2c352c"] },
];

function ColorSchemeFab({ scheme, setScheme, theme, setTheme }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="cs-dock">
      {!open && (
        <button className="cs-fab" onClick={() => setOpen(true)} title="Color palette">
          <span className="cs-fab-glyph">◌</span>
          <span>palette</span>
        </button>
      )}
      {open && (
        <div className="cs-panel">
          <div className="cs-head">
            <div className="cs-title">
              <span className="cs-mono">// palette</span>
              <span className="cs-h">broken future</span>
            </div>
            <button className="cs-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="cs-mode">
            <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}>☼ day</button>
            <button aria-pressed={theme === "dark"}  onClick={() => setTheme("dark")}>☾ night</button>
          </div>
          <div className="cs-grid">
            {SCHEMES.map(s => (
              <button key={s.id}
                className={"cs-card" + (scheme === s.id ? " active" : "")}
                onClick={() => setScheme(s.id)}>
                <div className="cs-swatches">
                  {s.swatch.map((c, i) => (
                    <span key={i} className="cs-sw" style={{ background: c }}></span>
                  ))}
                </div>
                <div className="cs-name">{s.name}</div>
                <div className="cs-sub">{s.sub}</div>
              </button>
            ))}
          </div>
          <div className="cs-foot">
            <span>// {SCHEMES.length} palettes · each tuned for day + night</span>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
