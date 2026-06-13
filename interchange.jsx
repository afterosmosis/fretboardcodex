/* Stage 3 · F7 — Modal interchange / borrowed chords.
   Tabs across the top by source mode. Each card shows roman, name,
   source + function meta, and 2 closed-triad voicing thumbnails.
   Clicking the card focuses the borrowed chord on the main fretboard
   (the F5 voicings panel then appears above for fingering choice).
*/

function ModalInterchange({ tonic, scale, family, palette, frets, onFocusChord, sectionProps, dragHandle }) {
  const [open, setOpen] = window.useCollapse("interchange", true, [".interchange"]);
  const groups = React.useMemo(
    () => window.Theory.borrowedChords(tonic, scale),
    [tonic, scale]
  );

  const tabIds = Object.keys(groups);
  const [activeTab, setActiveTab] = React.useState(tabIds[0]);

  // Reset active tab when the home family flips between major and minor —
  // the tab list itself changes shape.
  React.useEffect(() => {
    if (!tabIds.includes(activeTab)) setActiveTab(tabIds[0]);
  }, [family, tabIds, activeTab]);

  const activeChords = groups[activeTab] || [];

  return (
    <section className="interchange" aria-labelledby="ix-h" data-open={open ? "true" : "false"} {...sectionProps}>
      <div className="panel-head">
        <div className="panel-title" id="ix-h">
          {dragHandle}
          <window.CollapseBtn open={open} onToggle={() => setOpen(!open)} label="interchange" />
          modal interchange · <b>borrow from parallel modes</b>
        </div>
        {open && <span className="micro muted">click a chord to focus it on the fretboard</span>}
      </div>

      {open && (
      <>
      <div className="ix-tabs" role="tablist">
        {tabIds.map(id => (
          <button key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={"ix-tab" + (activeTab === id ? " active" : "")}
            onClick={() => setActiveTab(id)}>
            <span>{id}</span>
            <span className="ix-tab-count">{groups[id].length}</span>
          </button>
        ))}
      </div>

      {activeChords.length === 0 ? (
        <div className="ix-empty">no borrowed chords defined for this source.</div>
      ) : (
        <div className="ix-body">
          {activeChords.map((c, i) => (
            <BorrowedCard key={c.roman + "-" + i}
              chord={c}
              source={activeTab}
              palette={palette}
              frets={frets}
              onFocus={() => onFocusChord(c)} />
          ))}
        </div>
      )}
      </>
      )}
    </section>
  );
}

function BorrowedCard({ chord, source, palette, frets, onFocus }) {
  // Pull 2 illustrative voicings: prefer different string sets / inversions.
  const voicings = React.useMemo(() => {
    const all = window.Theory.closedTriadVoicings(chord, Math.min(frets, 12));
    // Group by string set; take lowest-fret voicing per set; cap at 2.
    const bySet = {};
    for (const v of all) {
      const k = v.stringSet;
      if (!bySet[k] || v.startFret < bySet[k].startFret) bySet[k] = v;
    }
    // Prefer treble-ish sets first (more guitar-typical).
    const order = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];
    return order.map(s => bySet[s]).filter(Boolean).slice(0, 2);
  }, [chord, frets]);

  return (
    <button className="ix-card" onClick={onFocus}
            title={`Focus ${chord.name} on the fretboard`}>
      <div className="ix-card-head">
        <span className="ix-roman">{chord.roman}</span>
        <span className="ix-name">{chord.name}</span>
      </div>

      <div className="ix-meta">
        <div className="ix-meta-row">
          <span className="ix-meta-lbl">source</span>
          <span className="ix-meta-val">{source}</span>
        </div>
        <div className="ix-meta-row">
          <span className="ix-meta-lbl">role</span>
          <span className="ix-meta-val">{chord.function}</span>
        </div>
        <div className="ix-meta-row">
          <span className="ix-meta-lbl">notes</span>
          <span className="ix-meta-val mono">
            {chord.notes.map(n => window.Theory.pretty(n)).join(" · ")}
          </span>
        </div>
      </div>

      <div className="ix-voicings">
        {voicings.length === 0 ? (
          <span className="muted micro">no closed voicings in {Math.min(frets, 12)} fr</span>
        ) : voicings.map((v, i) => (
          <div key={i} className="ix-voicing">
            <div className="ix-voicing-cap">
              <span>{v.stringSet}</span>
              <span className="muted">{v.inversion}</span>
            </div>
            <window.ChordBox voicing={v} palette={palette} />
          </div>
        ))}
      </div>
    </button>
  );
}

window.ModalInterchange = ModalInterchange;
