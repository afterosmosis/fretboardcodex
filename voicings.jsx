/* Stage 3 F5 + Stage 5 — Voicings panel with tabs.
     [triads | 7ths | extensions]
   - triads:     closed-triad voicings (3 notes), 4 string sets × 3 inversions
   - 7ths:       drop-2 seventh voicings (4 notes), 3 string sets × 4 inversions
   - extensions: tension toggle row (9/♭9/♯9/11/♯11/♭13/13) + live chord
                 symbol + upper-structure triad badge. The base chord tones and
                 the active extensions push markers up to the main fretboard
                 above (parent owns the markers chain).
*/

const VOICING_BOX_WIDTH  = 124;
const VOICING_BOX_HEIGHT = 96;

function ChordBox({ voicing, width = VOICING_BOX_WIDTH, height = VOICING_BOX_HEIGHT, palette = "color" }) {
  if (!voicing) return null;
  const { positions, startFret } = voicing;
  const span = 5;
  const winStart = Math.max(1, startFret);

  const padT = 16, padB = 18, padL = 18, padR = 14;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const stringGap = innerH / 5;
  const sY = i => padT + i * stringGap;
  const fretGap = innerW / span;

  const playedStrings = new Set(positions.map(p => p.s));

  const colorFor = (role) => {
    if (palette === "mono") {
      return { fill: "var(--ink)", text: "var(--bg)" };
    }
    if (role === "root") return { fill: "var(--c-root)", text: "#fff" };
    if (role === "t3")   return { fill: "var(--c-3rd)",  text: "#fff" };
    if (role === "t5")   return { fill: "var(--c-5th)",  text: "#fff" };
    if (role === "t7")   return { fill: "var(--c-7th)",  text: "#1a1a1a" };
    return { fill: "var(--c-7th)", text: "#1a1a1a" };
  };

  const dotR = 8;
  const showNut = winStart === 1;

  return (
    <svg className="chordbox-svg" viewBox={`0 0 ${width} ${height}`}
         preserveAspectRatio="xMidYMid meet"
         style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Strings (horizontal, s=0 / low-E on top to match main fretboard) */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`s${i}`} x1={padL} y1={sY(i)} x2={padL + innerW} y2={sY(i)}
              stroke="var(--ink)"
              strokeOpacity={0.55 + (5 - i) * 0.07}
              strokeWidth={0.7 + (5 - i) * 0.18} />
      ))}
      {/* Vertical fret lines */}
      {Array.from({ length: span + 1 }, (_, i) => (
        <line key={`f${i}`} x1={padL + i * fretGap} y1={padT - 2}
              x2={padL + i * fretGap} y2={padT + innerH + 2}
              stroke={i === 0 ? "var(--ink)" : "var(--rule-2)"}
              strokeWidth={i === 0 ? (showNut ? 3 : 1.5) : 1} />
      ))}
      {!showNut && (
        <text x={padL - 4} y={padT + innerH + 13}
              fontFamily="JetBrains Mono, monospace" fontSize="9"
              fill="var(--ink-4)" textAnchor="start">{winStart}fr</text>
      )}
      {/* Mute marks for un-played strings */}
      {Array.from({ length: 6 }, (_, i) => (
        !playedStrings.has(i) && (
          <text key={`x${i}`} x={padL - 9} y={sY(i) + 3}
                fontFamily="JetBrains Mono, monospace" fontSize="10"
                fill="var(--ink-4)" textAnchor="middle">×</text>
        )
      ))}
      {/* Dots */}
      {positions.map((p, i) => {
        const localF = p.f - winStart + 1;
        const cx = padL + (localF - 0.5) * fretGap;
        const cy = sY(p.s);
        const c = colorFor(p.role);
        const lbl = String(p.note).replace(/#/g, "♯").replace(/b/g, "♭");
        return (
          <g key={i}>
            {p.role === "root" ? (
              <rect x={cx - dotR} y={cy - dotR} width={dotR * 2} height={dotR * 2}
                    rx={2} fill={c.fill} />
            ) : (
              <circle cx={cx} cy={cy} r={dotR} fill={c.fill} />
            )}
            <text x={cx} y={cy + 3}
                  fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="700"
                  fill={c.text} textAnchor="middle">{lbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

function voicingKey(setId, invId) { return `${setId}/${invId}`; }

/* Lowest-fret voicing per (string set × inversion) for triads. */
function pickGridVoicings(chord, maxFret) {
  if (!chord) return {};
  const all = window.Theory.closedTriadVoicings(chord, maxFret);
  const grid = {};
  for (const v of all) {
    const k = voicingKey(v.stringSet, v.inversion);
    const existing = grid[k];
    if (!existing || v.startFret < existing.startFret) grid[k] = v;
  }
  return grid;
}

function stringsetLabel(id) {
  if (id === "1-2-3") return "treble · e B G";
  if (id === "2-3-4") return "upper mid · B G D";
  if (id === "3-4-5") return "lower mid · G D A";
  if (id === "4-5-6") return "bass · D A E";
  // drop-2 set labels (guitar-string numbers, low → high)
  if (id === "4-3-2-1") return "treble · D G B e";
  if (id === "5-4-3-2") return "middle · A D G B";
  if (id === "6-5-4-3") return "bass · E A D G";
  return id;
}

/* ============== Triads grid (3-note closed voicings) ============== */
function TriadsGrid({ chord, palette, frets, selectedVoicingKey, onSelectVoicing }) {
  const grid = React.useMemo(() => pickGridVoicings(chord, frets), [chord, frets]);

  return (
    <div className="voicings-grid">
      <div className="voicings-corner" />
      {window.Theory.INVERSIONS.map(inv => (
        <div key={inv.id} className="voicings-colhdr">
          {inv.label} <span className="muted">inv</span>
        </div>
      ))}
      {window.Theory.STRING_SETS.map(set => (
        <React.Fragment key={set.id}>
          <div className="voicings-rowhdr">
            <span className="set-id">strings {set.id}</span>
            <span className="muted">{stringsetLabel(set.id)}</span>
          </div>
          {window.Theory.INVERSIONS.map(inv => {
            const k = voicingKey(set.id, inv.id);
            const v = grid[k];
            const active = selectedVoicingKey === k;
            if (!v) {
              return (
                <div key={k} className="voicings-cell empty">
                  <span className="muted">—</span>
                </div>
              );
            }
            return (
              <button key={k}
                className={"voicings-cell" + (active ? " active" : "")}
                onClick={() => onSelectVoicing(v, k)}
                aria-pressed={active}
                title={`Play ${chord.name} on strings ${set.id} · ${inv.label} inv · starts at fret ${v.startFret}`}>
                <ChordBox voicing={v} palette={palette} />
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============== Sevenths grid (drop-2 voicings) ============== */
function SeventhsGrid({ chord, palette, frets, selectedVoicingKey, onSelectVoicing }) {
  // Derive a 7th-chord shape for the focused chord. If the focused chord lacks
  // a precomputed seventh (borrowed triads), we fabricate one from quality.
  const sevenChord = React.useMemo(() => {
    if (!chord) return null;
    const Th = window.Theory;
    const baseQ = Th.promoteToSeventh(chord.quality);
    const seventh = chord.seventh
      || window.Tonal.Note.transpose(chord.root, Th.seventhIntervalFor(chord.quality));
    return {
      ...chord,
      quality: baseQ,
      seventh,
      name: Th.pretty(chord.root) + Th.baseSymbolFor(baseQ),
    };
  }, [chord]);

  const grid = React.useMemo(
    () => window.Theory.pickDrop2Grid(sevenChord, frets),
    [sevenChord, frets]
  );

  return (
    <>
      <div className="voicings-banner">
        <span className="muted">drop-2 ·</span>
        <b>{sevenChord.name}</b>
        <span className="muted">· root–5th–7th–3rd shapes, voiced as one of four inversions</span>
      </div>
      <div className="voicings-grid voicings-grid--seven">
        <div className="voicings-corner" />
        {window.Theory.DROP2_INVERSIONS.map(inv => (
          <div key={inv.id} className="voicings-colhdr">
            {inv.label} <span className="muted">inv</span>
          </div>
        ))}
        {window.Theory.DROP2_STRING_SETS.map(set => (
          <React.Fragment key={set.id}>
            <div className="voicings-rowhdr">
              <span className="set-id">strings {set.id}</span>
              <span className="muted">{stringsetLabel(set.id)}</span>
            </div>
            {window.Theory.DROP2_INVERSIONS.map(inv => {
              const k = voicingKey(set.id, inv.id);
              const v = grid[k];
              const active = selectedVoicingKey === k;
              if (!v) {
                return (
                  <div key={k} className="voicings-cell empty">
                    <span className="muted">—</span>
                  </div>
                );
              }
              return (
                <button key={k}
                  className={"voicings-cell" + (active ? " active" : "")}
                  onClick={() => onSelectVoicing(v, k)}
                  aria-pressed={active}
                  title={`Play ${sevenChord.name} drop-2 · strings ${set.id} · ${inv.label} inv · starts at fret ${v.startFret}`}>
                  <ChordBox voicing={v} palette={palette} />
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

/* ============== Extensions builder ============== */
function ExtensionsBuilder({ chord, activeExtensions, setActiveExtensions }) {
  const Th = window.Theory;
  const baseQ = Th.promoteToSeventh(chord.quality);
  const availability = Th.extensionsAvailable(chord.quality);

  const extObj = React.useMemo(
    () => Th.extendChord(chord, activeExtensions),
    [chord, activeExtensions]
  );

  const handleToggle = (id) => {
    setActiveExtensions(prev => Th.toggleExtension(prev, id));
  };
  const handleClear = () => setActiveExtensions([]);

  // Group the toggle row visually by extension family (9 / 11 / 13)
  const groups = [
    { id: "9",  label: "9",  ids: ["b9", "9", "#9"] },
    { id: "11", label: "11", ids: ["11", "#11"] },
    { id: "13", label: "13", ids: ["b13", "13"] },
  ];

  return (
    <div className="ext-builder">
      <div className="ext-base">
        <span className="ext-base-lbl">base · </span>
        <b>{extObj.baseName}</b>
        <span className="ext-base-q">({baseQ})</span>
      </div>

      <div className="ext-toggles">
        {groups.map(g => (
          <div key={g.id} className="ext-group">
            <div className="ext-group-lbl">{g.label}</div>
            <div className="ext-group-row">
              {g.ids.map(id => {
                const def = Th.EXTENSIONS.find(e => e.id === id);
                const status = availability[id] || "off";
                const active = activeExtensions.includes(id);
                const disabled = status === "off";
                return (
                  <button key={id}
                    className={"ext-btn" + (active ? " active" : "") + " status-" + status}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => handleToggle(id)}
                    title={
                      disabled ? `${def.label} clashes with ${baseQ}` :
                      status === "avoid" ? `${def.label} is an "avoid" tone over ${baseQ}` :
                      `Add ${def.label}`
                    }>
                    {def.label}
                    {status === "avoid" && !disabled && <span className="ext-warn" aria-hidden="true">!</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button className="ext-clear iconbtn" onClick={handleClear}
                disabled={activeExtensions.length === 0}
                title="Clear all tensions">
          <span className="glyph">✕</span><span>clear</span>
        </button>
      </div>

      <div className="ext-result">
        <div className="ext-result-symbol">
          <span className="muted">// resulting chord</span>
          <b>{extObj.name}</b>
        </div>
        {extObj.extNotes.length > 0 && (
          <div className="ext-result-notes">
            <span className="muted">added · </span>
            {[...extObj.extNotes]
              .sort((a, b) => (parseInt(String(a.label).replace(/\D/g, ''), 10) || 0)
                             - (parseInt(String(b.label).replace(/\D/g, ''), 10) || 0))
              .map((e, i, arr) => (
              <span key={e.id} className="ext-result-note">
                {e.label} = <b>{Th.pretty(e.note)}</b>
                {i < arr.length - 1 ? <span className="muted">  ·  </span> : null}
              </span>
            ))}
          </div>
        )}
      </div>

      {extObj.upperStructure && (
        <div className="ust-card">
          <div className="ust-head">
            <span className="muted">upper structure</span>
            <span className="ust-roman">{extObj.upperStructure.roman}</span>
          </div>
          <div className="ust-slash">
            {extObj.upperStructure.slash}
          </div>
          <div className="ust-flavor">{extObj.upperStructure.flavor}</div>
          <div className="ust-hint">
            // play the triad <b>{extObj.upperStructure.triad}</b> over a {Th.pretty(chord.root)} bass.
          </div>
        </div>
      )}

      <div className="ext-foot muted">
        // additions appear on the fretboard above — click a tension to toggle.
        {" "}only one ♭/nat/♯ from each family at a time.
      </div>
    </div>
  );
}

/* ============== VoicingsPanel (the host) ============== */
function VoicingsPanel(props) {
  const {
    chord, palette, frets,
    voicingsTab, setVoicingsTab,
    selectedVoicingKey, onSelectVoicing, onClear,
    activeExtensions, setActiveExtensions,
  } = props;

  const [open, setOpen] = window.useCollapse("voicings");

  const Th = window.Theory;

  return (
    <section className="voicings" aria-labelledby="voicings-h" data-open={open ? "true" : "false"}>
      <div className="voicings-head">
        <div className="voicings-title">
          <window.CollapseBtn open={open} onToggle={() => setOpen(!open)} label="voicings" />
          <span id="voicings-h" className="micro muted">// voicings</span>
          <span className="voicings-chord">
            <b>{chord.name}</b>
            <span className="muted">{chord.roman}</span>
          </span>
        </div>
        {open && (
          <div className="voicings-tabs" role="tablist" aria-label="Voicings view">
            <button role="tab" aria-selected={voicingsTab === "triads"}
                    onClick={() => setVoicingsTab("triads")}>triads</button>
            <button role="tab" aria-selected={voicingsTab === "7ths"}
                    onClick={() => setVoicingsTab("7ths")}>7ths</button>
            <button role="tab" aria-selected={voicingsTab === "extensions"}
                    onClick={() => setVoicingsTab("extensions")}>extensions</button>
          </div>
        )}
      </div>

      {open && (
        <>
          {voicingsTab !== "extensions" && (
            <div className="voicings-subhead">
              <span className="muted">
                {voicingsTab === "triads"
                  ? "tap a cell · pins that triad voicing on the fretboard above"
                  : "tap a cell · pins that drop-2 seventh on the fretboard above"}
              </span>
              {selectedVoicingKey && (
                <button className="iconbtn" onClick={onClear} title="Clear pinned voicing">
                  <span className="glyph">✕</span><span>clear</span>
                </button>
              )}
            </div>
          )}

          {voicingsTab === "triads" && (
            <TriadsGrid
              chord={chord} palette={palette} frets={frets}
              selectedVoicingKey={selectedVoicingKey}
              onSelectVoicing={onSelectVoicing}
            />
          )}
          {voicingsTab === "7ths" && (
            <SeventhsGrid
              chord={chord} palette={palette} frets={frets}
              selectedVoicingKey={selectedVoicingKey}
              onSelectVoicing={onSelectVoicing}
            />
          )}
          {voicingsTab === "extensions" && (
            <ExtensionsBuilder
              chord={chord}
              activeExtensions={activeExtensions}
              setActiveExtensions={setActiveExtensions}
            />
          )}
        </>
      )}
    </section>
  );
}

// Expose for cross-script use.
window.ChordBox = ChordBox;
window.VoicingsPanel = VoicingsPanel;
window.TriadsGrid = TriadsGrid;
window.SeventhsGrid = SeventhsGrid;
window.ExtensionsBuilder = ExtensionsBuilder;
window.pickGridVoicings = pickGridVoicings;
