/* Stage 3 · F6 — Circle of fifths.
   Two concentric rings: outer = majors, inner = relative minors.
   - Selected wedge = current key's parent on the right ring (family-aware).
   - Opposite-ring partner = relative-key wedge ("relative" state).
   - ±1 step neighbors (outer AND inner) = "closely related keys".
   - Side panel reads out the signature + clickable closely-related list.
*/

function polarPoint(cx, cy, r, angleRad) {
  return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
}

function wedgePath(cx, cy, rIn, rOut, aStart, aEnd) {
  const [x1, y1] = polarPoint(cx, cy, rOut, aStart);
  const [x2, y2] = polarPoint(cx, cy, rOut, aEnd);
  const [x3, y3] = polarPoint(cx, cy, rIn,  aEnd);
  const [x4, y4] = polarPoint(cx, cy, rIn,  aStart);
  const large = (aEnd - aStart) > Math.PI ? 1 : 0;
  return `M ${x1} ${y1}
          A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2}
          L ${x3} ${y3}
          A ${rIn}  ${rIn}  0 ${large} 0 ${x4} ${y4}
          Z`;
}

const RING_OUTER_R = 200;
const RING_MID_R   = 130;
const RING_INNER_R = 60;

function CircleOfFifths({ tonic, scale, family, palette, onSwapTo, sectionProps, dragHandle }) {
  const [open, setOpen] = window.useCollapse("circle");
  const keys = window.Theory.circleKeys();
  const N = keys.length;
  const sliceAngle = (2 * Math.PI) / N;
  // Place C at top (angle = -90° = -π/2). i=0 → C.
  const startAngle = -Math.PI / 2 - sliceAngle / 2;

  // What position is the user "on"? Mode parent-major drives this.
  const parent = window.Theory.parentMajorTonic(tonic, scale);
  // Find index whose major matches parent (or its enharmonic).
  const parentEnh = window.Theory.enharmonic(parent);
  const selectedIdx = keys.findIndex(k =>
    k.major === parent || k.major === parentEnh
  );

  const sig = window.Theory.signatureOf(parent);
  const keyInfo = window.Theory.getKeyInfo(tonic, scale);

  const neighborIdxs = new Set();
  if (selectedIdx >= 0) {
    neighborIdxs.add((selectedIdx + 1 + N) % N);
    neighborIdxs.add((selectedIdx - 1 + N) % N);
  }

  // Decide which ring the user's tonic sits on, for state-marking purposes.
  // family = "major" → outer ring of selectedIdx
  // family = "minor" → inner ring of selectedIdx
  const userRing = family === "major" ? "outer" : "inner";

  const stateFor = (ring, idx) => {
    if (idx === selectedIdx) {
      if (ring === userRing) return "selected";
      return "relative";
    }
    if (neighborIdxs.has(idx)) return "neighbor";
    return "idle";
  };

  // For onClick, swap to the major or minor for that wedge.
  const handleClick = (ring, idx) => {
    const k = keys[idx];
    if (ring === "outer") onSwapTo(k.major, "major");
    else onSwapTo(k.minor, "minor");
  };

  const W = 460, H = 460;
  const cx = W / 2, cy = H / 2;

  return (
    <section className="circle-panel" data-open={open ? "true" : "false"} {...sectionProps}>
      <div className="panel-head">
        <div className="panel-title">
          {dragHandle}
          <window.CollapseBtn open={open} onToggle={() => setOpen(!open)} label="circle of fifths" />
          circle of fifths · <b>navigate by key signature</b>
        </div>
        {open && <span className="micro muted">click a wedge to jump</span>}
      </div>
      {open && (
      <div className="circle-body">
        <div className="circle-svg-wrap">
          <svg className="circle-svg" viewBox={`0 0 ${W} ${H}`}
               preserveAspectRatio="xMidYMid meet" aria-label="Circle of fifths">
            {/* Wedges — render outer first, then inner, so inner labels paint on top */}
            {keys.map((k, i) => {
              const a1 = startAngle + i * sliceAngle;
              const a2 = a1 + sliceAngle;
              return (
                <g key={`o-${i}`}>
                  <path className={`circle-slice ring-outer state-${stateFor("outer", i)}`}
                        d={wedgePath(cx, cy, RING_MID_R, RING_OUTER_R, a1, a2)}
                        onClick={() => handleClick("outer", i)} />
                </g>
              );
            })}
            {keys.map((k, i) => {
              const a1 = startAngle + i * sliceAngle;
              const a2 = a1 + sliceAngle;
              return (
                <g key={`i-${i}`}>
                  <path className={`circle-slice ring-inner state-${stateFor("inner", i)}`}
                        d={wedgePath(cx, cy, RING_INNER_R, RING_MID_R, a1, a2)}
                        onClick={() => handleClick("inner", i)} />
                </g>
              );
            })}
            {/* Inner hub: signature readout */}
            <circle cx={cx} cy={cy} r={RING_INNER_R}
                    fill="var(--surface)" stroke="var(--rule)" />
            <text x={cx} y={cy - 6}
                  fontFamily="Space Grotesk, sans-serif" fontWeight="500"
                  fontSize="28" fill="var(--accent)" textAnchor="middle">
              {sig.count > 0 ? `${sig.count}${sig.glyph}` : "♮"}
            </text>
            <text x={cx} y={cy + 14}
                  fontFamily="JetBrains Mono, monospace" fontSize="9"
                  fill="var(--ink-4)" textAnchor="middle"
                  letterSpacing="0.18em">
              {sig.type === "sharp" ? "SHARPS" : sig.type === "flat" ? "FLATS" : "NATURAL"}
            </text>
            {/* Outer + inner labels (separate layer so they're never clipped) */}
            {keys.map((k, i) => {
              const aMid = startAngle + (i + 0.5) * sliceAngle;
              const rOuterLbl = (RING_MID_R + RING_OUTER_R) / 2;
              const rInnerLbl = (RING_INNER_R + RING_MID_R) / 2;
              const [ox, oy] = polarPoint(cx, cy, rOuterLbl, aMid);
              const [ix, iy] = polarPoint(cx, cy, rInnerLbl, aMid);
              const sOuter = stateFor("outer", i);
              const sInner = stateFor("inner", i);
              return (
                <React.Fragment key={`lbl-${i}`}>
                  <g className={`circle-label state-${sOuter}`}>
                    <text x={ox} y={oy + 6}
                          fontFamily="Space Grotesk, sans-serif" fontWeight="500"
                          fontSize="20" textAnchor="middle">
                      {k.majorLabel}
                    </text>
                  </g>
                  <g className={`circle-label state-${sInner}`}>
                    <text x={ix} y={iy + 4}
                          fontFamily="Space Grotesk, sans-serif" fontWeight="500"
                          fontSize="13" textAnchor="middle">
                      {k.minorLabel}
                    </text>
                  </g>
                </React.Fragment>
              );
            })}
          </svg>
        </div>

        <CircleSide
          keyInfo={keyInfo}
          keys={keys}
          selectedIdx={selectedIdx}
          family={family}
          onSwapTo={onSwapTo} />
      </div>
      )}
    </section>
  );
}

function CircleSide({ keyInfo, keys, selectedIdx, family, onSwapTo }) {
  if (selectedIdx < 0) return <div className="circle-side"><span className="muted">no circle position</span></div>;
  const N = keys.length;
  const cur = keys[selectedIdx];
  const next = keys[(selectedIdx + 1) % N];      // dominant (+1 fifth)
  const prev = keys[(selectedIdx - 1 + N) % N];  // subdominant (-1 fifth)

  // Closely-related keys
  // In a major key: V, IV, vi, iii, ii  (== next.major, prev.major, cur.minor, next.minor, prev.minor)
  // In a minor key: III, iv, v, VI, VII, i  → simpler list: parallel major, dominant, subdominant
  const isMajor = family === "major";
  const rels = isMajor ? [
    { tag: "V",  label: `${cur.majorLabel} → ${next.majorLabel}`,  tonic: next.major, scaleId: "major", text: next.majorLabel },
    { tag: "IV", label: `${cur.majorLabel} → ${prev.majorLabel}`,  tonic: prev.major, scaleId: "major", text: prev.majorLabel },
    { tag: "vi", label: `${cur.majorLabel} → ${cur.minorLabel}`,   tonic: cur.minor,  scaleId: "minor", text: cur.minorLabel },
    { tag: "ii", label: `${cur.majorLabel} → ${prev.minorLabel}`,  tonic: prev.minor, scaleId: "minor", text: prev.minorLabel },
    { tag: "iii", label: `${cur.majorLabel} → ${next.minorLabel}`, tonic: next.minor, scaleId: "minor", text: next.minorLabel },
  ] : [
    { tag: "III", label: `${cur.minorLabel} → ${cur.majorLabel}`,  tonic: cur.major,  scaleId: "major", text: cur.majorLabel },
    { tag: "v",   label: `${cur.minorLabel} → ${next.minorLabel}`, tonic: next.minor, scaleId: "minor", text: next.minorLabel },
    { tag: "iv",  label: `${cur.minorLabel} → ${prev.minorLabel}`, tonic: prev.minor, scaleId: "minor", text: prev.minorLabel },
    { tag: "VII", label: `${cur.minorLabel} → ${next.majorLabel}`, tonic: next.major, scaleId: "major", text: next.majorLabel },
    { tag: "VI",  label: `${cur.minorLabel} → ${prev.majorLabel}`, tonic: prev.major, scaleId: "major", text: prev.majorLabel },
  ];

  const sig = keyInfo.signature;

  return (
    <div className="circle-side">
      <span className="lbl">closely related keys</span>
      <div className="sig-readout">
        <span className="sig-big">{sig.count > 0 ? `${sig.count}${sig.glyph}` : "♮"}</span>
        <span className="muted">
          {sig.type === "natural" ? "no sharps · no flats" :
           `${sig.count} ${sig.count === 1 ? sig.type : sig.type + "s"} ·`}
          {sig.type !== "natural" && (
            <> shared by <button className="linkbtn"
                                 onClick={() => onSwapTo(
                                    isMajor ? cur.minor : cur.major,
                                    isMajor ? "minor" : "major")}>
              {isMajor ? cur.minorLabel : cur.majorLabel}
            </button></>
          )}
        </span>
      </div>

      <div className="rel-list">
        {rels.map(r => (
          <div key={r.tag} className="rel-row">
            <span className="rel-tag">{r.tag}</span>
            <button className="rel-btn"
                    onClick={() => onSwapTo(r.tonic, r.scaleId)}>
              {r.text}
            </button>
          </div>
        ))}
      </div>

      <div className="circle-help">
        // ± one fifth + relative-minor partners.
        <br/>// click any wedge to jump there.
      </div>
    </div>
  );
}

window.CircleOfFifths = CircleOfFifths;
