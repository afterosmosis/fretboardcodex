/* Theme-aware, theory-driven fretboard.
   Accepts `markers` as a prop: [{ s, f, label, kind }]
     - s: string index, 0 = low E … 5 = high e
     - f: fret 0..frets
     - label: note name to render inside the dot
     - kind: 'root' | 't3' | 't5' | 't7' | 'ext' | 'n'
        ('ext' = extension tone: 9/11/13 family, rendered as an outlined accent dot)
*/

function Fretboard({ frets = 12, lefty = false, palette = "color", markers = [], showFingerings = false }) {
  const stringCount = 6;
  const stringNames = ["E","A","D","G","B","e"];

  const baseFretPx = frets >= 22 ? 36 : frets >= 15 ? 48 : 64;
  // Asymmetric horizontal padding: the side that carries the nut also carries
  // open-position markers + string-name labels and needs room for both.
  // Swap which side gets which when mirrored so lefty doesn't clip on the right.
  const padNut = 52, padTail = 20, padT = 22, padB = 22;
  const padL = lefty ? padTail : padNut;
  const padR = lefty ? padNut : padTail;
  const innerW = baseFretPx * frets;
  const w = padL + innerW + padR;
  const stringGap = 22;
  const innerH = stringGap * (stringCount - 1);
  const h = padT + innerH + padB;

  const stringYs = Array.from({length: stringCount}, (_, i) => padT + (innerH * i)/(stringCount-1));
  const fretXs = Array.from({length: frets+1}, (_, i) => padL + (innerW * i)/frets);

  const visible = markers.filter(m => m.f <= frets);

  const inkVar = "var(--ink)";
  const ruleVar = "var(--rule-2)";
  const subInk = "var(--ink-3)";

  const colorFor = (k) => {
    if (palette === "mono") {
      if (k === "root") return { fill: inkVar, stroke: inkVar, text: "var(--bg)" };
      return { fill: "var(--surface)", stroke: inkVar, text: inkVar };
    }
    if (k === "root") return { fill: "var(--c-root)", stroke: "var(--c-root)", text: "#fff" };
    if (k === "t3")   return { fill: "var(--c-3rd)",  stroke: "var(--c-3rd)",  text: "#fff" };
    if (k === "t5")   return { fill: "var(--c-5th)",  stroke: "var(--c-5th)",  text: "#fff" };
    if (k === "t7")   return { fill: "var(--c-7th)",  stroke: "var(--c-7th)",  text: "#1a1a1a" };
    if (k === "ext")  return { fill: "var(--surface)", stroke: "var(--accent)", text: "var(--accent)" };
    return { fill: "var(--surface)", stroke: subInk, text: "var(--ink-2)" };
  };

  const dotR = 10;

  // Distance from nut to open-marker dot / string-name label.
  // String name sits further out than the open dot so the two don't overlap.
  const openOffset = 16;
  const labelOffset = 36;

  // String index 0 = low E. Render it at the BOTTOM (standard fretboard view):
  // high e on top, low E on the bottom. Lefty mirrors horizontally only (fret
  // direction), so the vertical string order stays the same.
  const rowFor = (s) => stringCount - 1 - s;

  const xy = (s, f) => {
    const sIdx = rowFor(s);
    const fIdx = lefty ? (frets - f) : f;
    let x;
    if (f === 0) {
      x = lefty ? fretXs[frets] + openOffset : fretXs[0] - openOffset;
    } else {
      x = lefty ? (fretXs[fIdx] + fretXs[fIdx+1])/2 : (fretXs[fIdx-1] + fretXs[fIdx])/2;
    }
    return { x, y: stringYs[sIdx] };
  };

  const inlaySingles = [3, 5, 7, 9, 15, 17, 19, 21].filter(f => f <= frets);
  const inlayDoubles = [12].filter(f => f <= frets);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
         style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Nut */}
      <line x1={lefty ? fretXs[frets] : fretXs[0]} y1={padT-6}
            x2={lefty ? fretXs[frets] : fretXs[0]} y2={padT+innerH+6}
            stroke={inkVar} strokeWidth="4" strokeLinecap="square" />
      {/* Frets */}
      {fretXs.slice(1, -1).map((x,i) => (
        <line key={i} x1={x} y1={padT-2} x2={x} y2={padT+innerH+2}
              stroke={ruleVar} strokeWidth="1.2" />
      ))}
      {/* End line */}
      <line x1={lefty ? fretXs[0] : fretXs[frets]} y1={padT-2}
            x2={lefty ? fretXs[0] : fretXs[frets]} y2={padT+innerH+2}
            stroke={ruleVar} strokeWidth="1.2" />
      {/* Strings */}
      {stringYs.map((y,i) => (
        <line key={i} x1={padL} y1={y} x2={padL+innerW} y2={y}
              stroke={inkVar} strokeOpacity={0.55 + i*0.07}
              strokeWidth={0.7 + i*0.22} />
      ))}
      {/* Inlays */}
      {inlaySingles.map(f => {
        const fi = lefty ? (frets - f + 1) : f;
        const x = (fretXs[fi-1]+fretXs[fi])/2;
        const y = padT + innerH/2;
        return <circle key={f} cx={x} cy={y} r="3" fill={ruleVar} opacity="0.7" />;
      })}
      {inlayDoubles.map(f => {
        const fi = lefty ? (frets - f + 1) : f;
        const x = (fretXs[fi-1]+fretXs[fi])/2;
        return (
          <g key={f}>
            <circle cx={x} cy={padT + innerH*0.28} r="3" fill={ruleVar} opacity="0.7" />
            <circle cx={x} cy={padT + innerH*0.72} r="3" fill={ruleVar} opacity="0.7" />
          </g>
        );
      })}
      {/* String name labels */}
      {stringNames.map((n,i) => {
        const yIdx = rowFor(i);
        const x = lefty ? fretXs[frets] + labelOffset : fretXs[0] - labelOffset;
        return (
          <text key={n+i} x={x} y={stringYs[yIdx]+3}
                fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="500"
                fill={subInk} textAnchor="middle">{n}</text>
        );
      })}
      {/* Fret number labels */}
      {Array.from({length: frets}, (_, i) => i+1).map(f => {
        const fi = lefty ? (frets - f + 1) : f;
        const x = (fretXs[fi-1] + fretXs[fi])/2;
        return (
          <text key={f} x={x} y={padT + innerH + 16}
                fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="400"
                fill={subInk} textAnchor="middle"
                opacity={[3,5,7,9,12,15,17,19,21,24].includes(f) ? 1 : 0.85}>{f}</text>
        );
      })}
      {/* Markers */}
      {visible.map((m, i) => {
        const { x, y } = xy(m.s, m.f);
        const c = colorFor(m.kind);
        const isRoot = m.kind === "root";
        return (
          <g key={`${m.s}-${m.f}-${i}`}>
            {isRoot ? (
              <rect x={x-dotR} y={y-dotR} width={dotR*2} height={dotR*2}
                    rx="2" fill={c.fill} stroke={c.stroke} strokeWidth="1.2" />
            ) : (
              <circle cx={x} cy={y} r={dotR} fill={c.fill} stroke={c.stroke}
                      strokeWidth={m.kind === "n" ? 1.3 : m.kind === "ext" ? 1.8 : 1.1}
                      strokeDasharray={m.kind === "ext" ? "2.5 1.5" : undefined} />
            )}
            <text x={x} y={y+3.2} fontFamily="JetBrains Mono, monospace"
                  fontSize="9.5" fontWeight="600" fill={c.text}
                  textAnchor="middle">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

window.Fretboard = Fretboard;
