/* Stage 4 · F11 — Practice routine suggester.
   - Template library (Appendix A). Each template has an id, label, hint,
     optional anchor (CSS selector to scroll to), and `{key}` is interpolated.
   - SHAPES[length][focus] returns an ordered list of [category, minutes].
   - composeRoutine() picks templates from the right pools with a seed for shuffle.
*/

const PRACTICE_TEMPLATES = {
  warmup: [
    { id: "w-chrom",       label: "Chromatic 1-2-3-4 finger exercise",       hint: "Each string · slow tempo · clean tone" },
    { id: "w-spider",      label: "Spider exercise (1-3-2-4 fingering)",     hint: "All six strings · alternate picking" },
    { id: "w-pent-box1",   label: "Pentatonic box 1 in {key}",                hint: "Ascending + descending with metronome",      anchor: ".panel" },
    { id: "w-single-str",  label: "Single-string {key} scale runs",           hint: "Up and down, one string at a time",          anchor: ".panel" },
    { id: "w-open-i4v",    label: "Open-chord I–IV–V cycle in {key}",         hint: "Focus on clean transitions",                 anchor: ".harmony" },
    { id: "w-ho-po",       label: "Hammer-on / pull-off pairs in {key}",      hint: "Through the scale on each string",           anchor: ".panel" },
    { id: "w-octave",      label: "Octave hunt · {tonic} root",                hint: "Find every octave across the fretboard",     anchor: ".panel" },
    { id: "w-pair-chrom",  label: "String-pair chromatic runs",                hint: "Strings 6-5, 5-4, 4-3, …" },
  ],
  technique: [
    { id: "t-pent-12",     label: "{tonic} major pentatonic boxes 1 & 2",     hint: "Ascending + descending · metronome",    anchor: ".panel" },
    { id: "t-pent-connect",label: "Connect {tonic} pentatonic boxes 1 → 2 → 3", hint: "Across the neck, one position at a time", anchor: ".panel" },
    { id: "t-min-pent",    label: "{tonic} minor pentatonic + ♭5 blues note", hint: "All 5 boxes",                            anchor: ".panel" },
    { id: "t-3nps",        label: "3-notes-per-string {tonic} major scale",    hint: "Positions 1–3 cleanly",                   anchor: ".panel" },
    { id: "t-thirds",      label: "{tonic} major scale in thirds",             hint: "Ascending pairs: 1-3, 2-4, 3-5, …",       anchor: ".panel" },
    { id: "t-alt-pick",    label: "Alternate picking · {tonic} pentatonic",    hint: "Strict down-up · metronome",              anchor: ".panel" },
    { id: "t-legato",      label: "Legato run · {tonic} major (3nps)",         hint: "Slurs clean, no pick attacks on them",    anchor: ".panel" },
    { id: "t-sweep",       label: "Sweep picking · {tonic} triads (str 2-3-4)", hint: "Up- and down-sweeps · stay close",        anchor: ".harmony" },
    { id: "t-skip",        label: "String skipping · {tonic} arpeggios",       hint: "Root → 5th → 3rd → octave",               anchor: ".panel" },
    { id: "t-hybrid",      label: "Hybrid picking · {tonic} triads",           hint: "Pick + middle + ring fingers",            anchor: ".harmony" },
  ],
  visualization: [
    { id: "v-caged-e",     label: "CAGED E shape in {key}",                    hint: "Verbalize root, 3rd, 5th in each position", anchor: ".panel" },
    { id: "v-root-map",    label: "Map all {tonic} roots across 6 strings",   hint: "Speak each fret + string out loud",        anchor: ".panel" },
    { id: "v-thirds-map",  label: "Every major 3rd from {tonic} roots",        hint: "Both directions on the neck",              anchor: ".panel" },
    { id: "v-scale-pos",   label: "{key} scale across 6 strings in one position", hint: "Stay in box · no shifts",              anchor: ".panel" },
    { id: "v-caged-connect", label: "Connect adjacent CAGED shapes in {key}",  hint: "Identify shared notes between shapes",     anchor: ".panel" },
    { id: "v-imaj7-tones", label: "Locate every Imaj7 chord tone in {key}",    hint: "R · 3 · 5 · 7 across the neck",            anchor: ".panel" },
    { id: "v-pent-in-e",   label: "Pentatonic-to-CAGED overlay in {key}",      hint: "How box 1 lives inside the E shape",       anchor: ".panel" },
    { id: "v-bvii-roots",  label: "Every ♭VII root in {key}",                  hint: "A frequent modal-interchange target",      anchor: ".interchange" },
    { id: "v-rel-min",     label: "Relative-minor pentatonic in {key}",        hint: "How it sits inside the parent major",      anchor: ".keycard" },
    { id: "v-modal-char",  label: "Characteristic note of each mode of {key}", hint: "Where the color lives on the neck",        anchor: ".panel" },
  ],
  application: [
    { id: "a-i-iv-v-vi",   label: "I–IV–V–vi closed triads in {key} (str 2-3-4)", hint: "All on one string set",                anchor: ".harmony" },
    { id: "a-ii-v-i-7",    label: "ii–V–I 7th-chord voicings in {key}",         hint: "Smooth voice leading",                    anchor: ".harmony" },
    { id: "a-12bar",       label: "12-bar blues in {key} · dominant 7ths",      hint: "Dom 7 voicings on I, IV, V",              anchor: ".harmony" },
    { id: "a-all-7ths",    label: "Cycle all diatonic 7ths in {key}",           hint: "Imaj7 → ii7 → iii7 → IVmaj7 → V7 → vi7 → viiø7", anchor: ".harmony" },
    { id: "a-i-inv",       label: "{key} I-chord inversions up the neck",       hint: "Root, 1st, 2nd · repeat",                 anchor: ".harmony" },
    { id: "a-i-v-vi-iv",   label: "I–V–vi–IV in {key} · closed voicings",      hint: "Modern pop loop",                          anchor: ".harmony" },
    { id: "a-triads-123",  label: "{key} diatonic triads on strings 1-2-3",     hint: "All 3 inversions · up the neck",          anchor: ".harmony" },
    { id: "a-i-vi-ii-v",   label: "I–vi–ii–V in {key} · closed voicings",      hint: "Jazz turnaround",                          anchor: ".harmony" },
    { id: "a-vi-iv-i-v",   label: "vi–IV–I–V in {key} · triads",                hint: "Modern pop loop, vi entry",                anchor: ".harmony" },
    { id: "a-voice-lead",  label: "I → IV → V → I · minimal motion in {key}",   hint: "Lock voice leading on one string set",    anchor: ".harmony" },
  ],
  extended: [
    { id: "e-bvii-loop",   label: "I–♭VII–IV–I in {key}",                       hint: "Borrow ♭VII from parallel minor",         anchor: ".interchange" },
    { id: "e-bvi",         label: "I–V–♭VI–IV in {key}",                        hint: "Add ♭VI as a chromatic surprise",         anchor: ".interchange" },
    { id: "e-iv-min",      label: "I–IV–iv–I in {key}",                         hint: "Minor IV as chromatic descent",            anchor: ".interchange" },
    { id: "e-picardy",     label: "Picardy: vi–iv–V–I (major) in {key}",        hint: "Resolve minor loop to major tonic",        anchor: ".harmony" },
    { id: "e-sec-dom",     label: "V/V → V → I in {key}",                       hint: "Secondary dominant of the dominant",       anchor: ".harmony" },
    { id: "e-tritone",     label: "Tritone sub · ii–♭II7–I in {key}",           hint: "Replace V7 with ♭II7",                     anchor: ".interchange" },
    { id: "e-anthem",      label: "I–♭III–♭VI–♭VII in {key}",                   hint: "Rock-anthem borrowed loop",                anchor: ".interchange" },
    { id: "e-neap",        label: "Neapolitan ♭II (1st inversion) → V in {key}", hint: "Resolves powerfully to V",                anchor: ".interchange" },
    { id: "e-chrom-med",   label: "Chromatic mediant: I → ♭III → I in {key}",   hint: "Observe the shared note",                  anchor: ".interchange" },
    { id: "e-mixo",        label: "Parallel Mixolydian: I–♭VII–IV in {key}",    hint: "Mixolydian color over major",              anchor: ".interchange" },
    { id: "e-dorian",      label: "Parallel Dorian vamp: i–IV in {key}",        hint: "Major IV over minor i",                    anchor: ".interchange" },
  ],
  freeplay: [
    { id: "f-i-iv-v",      label: "Improvise over I–IV–V in {key}",            hint: "Major pentatonic, all positions",          anchor: ".harmony" },
    { id: "f-pop-loop",    label: "Improvise over I–vi–IV–V in {key}",         hint: "Move between CAGED shapes",                anchor: ".harmony" },
    { id: "f-min-blues",   label: "Minor blues in {key}'s relative minor",     hint: "Min pent + ♭5 blues note",                 anchor: ".keycard" },
    { id: "f-target",      label: "Target chord tones over {key} changes",     hint: "Land on R / 3 / 5 / 7 on downbeats",        anchor: ".harmony" },
    { id: "f-i-vamp",      label: "Static {key} I vamp · one CAGED shape",     hint: "Stay in one box · phrase lyrically",       anchor: ".panel" },
    { id: "f-ii-v-i-arp",  label: "Solo ii–V–I in {key} with arpeggios",       hint: "Outline each chord cleanly",                anchor: ".harmony" },
    { id: "f-interchange", label: "Use ♭VII / ♭VI in solos over {key}",        hint: "Modal-interchange color tones",             anchor: ".interchange" },
    { id: "f-modal",       label: "Improvise in a chosen mode of {key}",       hint: "Dorian, Mixolydian over a static vamp",    anchor: ".keycard" },
    { id: "f-trade-fours", label: "Trade fours with yourself in {key}",        hint: "4 bars rhythm · 4 bars lead" },
    { id: "f-mixed-blues", label: "12-bar blues in {key} · mixed pentatonic",  hint: "Major + minor pent blended",                anchor: ".harmony" },
  ],
};

// length × focus → ordered [category, minutes] tuples
// Every shape sums to exactly the session length.
const SESSION_SHAPES = {
  30: {
    balanced:   [["warmup",5],["visualization",10],["application",10],["freeplay",5]],
    improv:     [["warmup",5],["technique",10],["freeplay",15]],
    harmony:    [["warmup",5],["application",10],["extended",10],["freeplay",5]],
    technique:  [["warmup",5],["technique",10],["technique",10],["freeplay",5]],
    theory:     [["warmup",5],["visualization",10],["application",10],["freeplay",5]],
  },
  45: {
    balanced:   [["warmup",5],["technique",10],["visualization",10],["application",10],["extended",5],["freeplay",5]],
    improv:     [["warmup",5],["technique",10],["technique",10],["visualization",5],["freeplay",15]],
    harmony:    [["warmup",5],["technique",10],["application",10],["application",10],["extended",5],["freeplay",5]],
    technique:  [["warmup",5],["technique",10],["technique",10],["technique",10],["visualization",5],["freeplay",5]],
    theory:     [["warmup",5],["visualization",10],["visualization",10],["application",10],["extended",5],["freeplay",5]],
  },
  60: {
    balanced:   [["warmup",5],["technique",10],["visualization",10],["application",10],["extended",5],["application",10],["extended",5],["freeplay",5]],
    improv:     [["warmup",5],["technique",10],["technique",10],["visualization",10],["application",5],["freeplay",10],["freeplay",10]],
    harmony:    [["warmup",5],["technique",10],["application",10],["application",10],["application",10],["extended",10],["freeplay",5]],
    technique:  [["warmup",5],["technique",10],["technique",10],["technique",10],["technique",10],["visualization",10],["freeplay",5]],
    theory:     [["warmup",5],["visualization",10],["visualization",10],["application",10],["application",10],["extended",10],["freeplay",5]],
  },
};

const FOCUS_LIST = [
  { id: "balanced",  label: "balanced",       hint: "a bit of everything" },
  { id: "improv",    label: "improvisation",  hint: "lead playing + solos" },
  { id: "harmony",   label: "harmony",        hint: "chords + voice leading" },
  { id: "technique", label: "technique",      hint: "picking + position" },
  { id: "theory",    label: "theory",         hint: "fretboard + reasoning" },
];

const CAT_META = {
  warmup:        { letter: "W", label: "warm-up"       },
  technique:     { letter: "T", label: "technique"     },
  visualization: { letter: "V", label: "visualization" },
  application:   { letter: "A", label: "application"   },
  extended:      { letter: "X", label: "extended"      },
  freeplay:      { letter: "F", label: "free play"     },
};

// Tiny seeded LCG so a given seed produces a stable routine.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function composeRoutine({ length, focus, keyName, tonicName, seed }) {
  const shape = SESSION_SHAPES[length][focus];
  const rng = mulberry32(seed || 1);
  const used = new Set();
  const pick = (cat) => {
    const pool = PRACTICE_TEMPLATES[cat];
    const free = pool.filter(t => !used.has(t.id));
    const src = free.length ? free : pool; // wrap if every template is used
    const t = src[Math.floor(rng() * src.length)];
    used.add(t.id);
    return t;
  };

  const fill = (s) => s
    .replace(/\{tonic\}/g, tonicName || keyName)
    .replace(/\{key\}/g, keyName);

  let cursor = 0;
  const blocks = shape.map(([cat, dur]) => {
    const t = pick(cat);
    const block = {
      category: cat,
      duration: dur,
      startMin: cursor,
      endMin: cursor + dur,
      label: fill(t.label),
      hint:  fill(t.hint),
      anchor: t.anchor || null,
      templateId: t.id,
    };
    cursor += dur;
    return block;
  });

  return { blocks, totalMin: cursor };
}

function fmtMin(m) {
  const mm = Math.floor(m);
  return `${mm}:00`;
}

/* ============================================================
   Practice routine UI
   ============================================================ */
function PracticeSession({ tonic, scale, keyInfo, onJump, sectionProps, dragHandle }) {
  const saved = readSessionPrefs();
  const [length,  setLength]  = React.useState(saved.length  || 45);
  const [focus,   setFocus]   = React.useState(saved.focus   || "balanced");
  const [open,    setOpen]    = React.useState(saved.open !== false);
  const [seed,    setSeed]    = React.useState(() => Math.floor(Math.random() * 1e9));

  React.useEffect(() => {
    writeSessionPrefs({ length, focus, open });
  }, [length, focus, open]);

  const keyName = `${window.Theory.pretty(tonic)} ${scaleLabel(scale)}`;
  const tonicName = window.Theory.pretty(tonic);

  const routine = React.useMemo(
    () => composeRoutine({ length, focus, keyName, tonicName, seed }),
    [length, focus, keyName, tonicName, seed]
  );

  const focusEntry = FOCUS_LIST.find(f => f.id === focus) || FOCUS_LIST[0];

  return (
    <section className="session" data-open={open ? "true" : "false"} {...sectionProps}>
      <div className="session-head">
        {dragHandle}
        <button className="session-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="session-body"
          title={open ? "Collapse session" : "Open session"}>
          <span className="session-toggle-glyph">{open ? "▾" : "▸"}</span>
          <span className="session-toggle-title">today's session</span>
          <span className="session-toggle-meta">
            <span className="muted">·</span>
            <span>{length} min</span>
            <span className="muted">·</span>
            <span>{focusEntry.label}</span>
            <span className="muted">·</span>
            <span className="key-tag">in {keyName}</span>
          </span>
        </button>

        {open && (
          <div className="session-actions">
            <button className="iconbtn" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
              title="Shuffle: regenerate with the same length + focus">
              <span className="glyph">↻</span><span>shuffle</span>
            </button>
            <button className="iconbtn" onClick={() => window.print()}
              title="Print the routine">
              <span className="glyph">⎙</span><span>print</span>
            </button>
          </div>
        )}
      </div>

      {open && (
        <div id="session-body" className="session-body">
          <SessionControls
            length={length} setLength={setLength}
            focus={focus}   setFocus={setFocus}
          />
          <SessionTimeline blocks={routine.blocks} total={routine.totalMin} onJump={onJump} />
        </div>
      )}
    </section>
  );
}

function SessionControls({ length, setLength, focus, setFocus }) {
  return (
    <div className="session-controls">
      <div className="session-control">
        <span className="micro muted">length</span>
        <div className="seg">
          {[30, 45, 60].map(n => (
            <button key={n} aria-pressed={length === n}
              onClick={() => setLength(n)}>{n} min</button>
          ))}
        </div>
      </div>
      <div className="session-control session-control-focus">
        <span className="micro muted">focus</span>
        <div className="seg seg-wrap">
          {FOCUS_LIST.map(f => (
            <button key={f.id} aria-pressed={focus === f.id}
              onClick={() => setFocus(f.id)} title={f.hint}>{f.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionTimeline({ blocks, total, onJump }) {
  return (
    <ol className="timeline" aria-label="Practice routine">
      {blocks.map((b, i) => {
        const cm = CAT_META[b.category];
        const isLast = i === blocks.length - 1;
        return (
          <li key={i} className={`tl-row cat-${b.category}`}>
            <div className="tl-time">
              <span className="tl-start">{fmtMin(b.startMin)}</span>
              <span className="tl-bar"
                    style={{ "--len": `${(b.duration / total) * 100}%` }}
                    aria-hidden="true"></span>
              <span className="tl-dur">{b.duration} min</span>
            </div>
            <div className="tl-pill" title={cm.label}>
              <span className="tl-pill-letter">{cm.letter}</span>
              <span className="tl-pill-label">{cm.label}</span>
            </div>
            <div className="tl-content">
              <div className="tl-label">{b.label}</div>
              <div className="tl-hint">{b.hint}</div>
            </div>
            <div className="tl-jump">
              {b.anchor ? (
                <button className="tl-jump-btn" onClick={() => onJump(b.anchor)}
                  title={`Jump to ${b.anchor.replace(".", "")}`}>
                  goto <span aria-hidden="true">→</span>
                </button>
              ) : (
                <span className="tl-jump-muted">—</span>
              )}
            </div>
            {!isLast && <span className="tl-divider" aria-hidden="true"></span>}
          </li>
        );
      })}
    </ol>
  );
}

function scaleLabel(scaleId) {
  // The SCALES list lives in foundation.jsx; mirror just the label we need.
  const map = {
    "major": "major", "minor": "minor",
    "dorian": "dorian", "phrygian": "phrygian", "lydian": "lydian",
    "mixolydian": "mixolydian", "locrian": "locrian",
    "harm-minor": "harmonic min", "mel-minor": "melodic min",
    "maj-pent": "major pent", "min-pent": "minor pent", "blues": "blues",
  };
  return map[scaleId] || scaleId;
}

const SESSION_STORAGE = "fretwise:session:v1";
function readSessionPrefs() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeSessionPrefs(p) {
  try { localStorage.setItem(SESSION_STORAGE, JSON.stringify(p)); } catch {}
}

window.PracticeSession = PracticeSession;
window.composeRoutine = composeRoutine;
window.PRACTICE_TEMPLATES = PRACTICE_TEMPLATES;
window.SESSION_SHAPES = SESSION_SHAPES;
