/* =========================================================================
   theory.js — wraps Tonal.js into a clean, key-aware API.
   Loaded as plain JS (not JSX). Exposes window.Theory.
   ========================================================================= */
(function () {
  if (!window.Tonal) {
    console.error("[theory] Tonal.js missing — load it before theory.js.");
    return;
  }
  const T = window.Tonal;

  // ---- Scale ID → Tonal scale name ----
  const SCALE_NAMES = {
    "major":      "major",
    "minor":      "minor",
    "dorian":     "dorian",
    "phrygian":   "phrygian",
    "lydian":     "lydian",
    "mixolydian": "mixolydian",
    "locrian":    "locrian",
    "harm-minor": "harmonic minor",
    "mel-minor":  "melodic minor",
    "maj-pent":   "major pentatonic",
    "min-pent":   "minor pentatonic",
    "blues":      "blues",
  };

  // Diatonic mode → interval down to its parent major
  const MODE_TO_PARENT = {
    "major":      "1P",
    "dorian":     "-2M",
    "phrygian":   "-3M",
    "lydian":     "-4P",
    "mixolydian": "-5P",
    "minor":      "-6M",
    "locrian":    "-7M",
    "maj-pent":   "1P",
    "min-pent":   "-6M",
    "blues":      "-6M",
    "harm-minor": "-6M",
    "mel-minor":  "-6M",
  };

  // Family tells us how to compute parallel + relative
  const FAMILY = {
    "major":      "major",
    "lydian":     "major",
    "mixolydian": "major",
    "maj-pent":   "major",
    "minor":      "minor",
    "dorian":     "minor",
    "phrygian":   "minor",
    "locrian":    "minor",
    "min-pent":   "minor",
    "blues":      "minor",
    "harm-minor": "minor",
    "mel-minor":  "minor",
  };

  // Pretty display: F# → F♯, Bb → B♭
  function pretty(name) {
    if (!name) return "";
    return String(name).replace(/#/g, "♯").replace(/b/g, "♭");
  }

  function degreeLabel(intv) {
    const m = String(intv).match(/^(-?)(\d+)(P|M|m|d|A)$/);
    if (!m) return intv;
    const num = m[2], q = m[3];
    if (q === "P" || q === "M") return num;
    if (q === "m") return "♭" + num;
    if (q === "d") return "♭" + num;
    if (q === "A") return "♯" + num;
    return num;
  }

  function intervalToRole(intv) {
    const m = String(intv).match(/^-?(\d+)/);
    if (!m) return "n";
    const num = m[1];
    if (num === "1" || num === "8") return "root";
    if (num === "3") return "t3";
    if (num === "5") return "t5";
    if (num === "7") return "t7";
    return "n";
  }

  function getScale(tonic, scaleId) {
    const name = SCALE_NAMES[scaleId] || "major";
    return T.Scale.get(`${tonic} ${name}`);
  }

  function parentMajorTonic(tonic, scaleId) {
    const offset = MODE_TO_PARENT[scaleId] || "1P";
    return T.Note.transpose(tonic, offset);
  }

  // Returns { count, type: 'sharp'|'flat'|'natural', glyph: '♯'|'♭'|'' }
  function signatureOf(parentMajor) {
    const k = T.Key.majorKey(parentMajor);
    const raw = (k && k.keySignature) || "";
    if (raw.includes("#")) return { count: raw.length, type: "sharp", glyph: "♯" };
    if (raw.includes("b")) return { count: raw.length, type: "flat",  glyph: "♭" };
    return { count: 0, type: "natural", glyph: "" };
  }

  // Convert a sharp-spelled tonic to its flat equivalent (or vice versa) when needed.
  // Tonal.Note.enharmonic handles this.
  function enharmonic(n) {
    return T.Note.enharmonic(n) || n;
  }

  function getKeyInfo(tonic, scaleId) {
    const scale = getScale(tonic, scaleId);
    const parent = parentMajorTonic(tonic, scaleId);
    const sig = signatureOf(parent);
    const fam = FAMILY[scaleId] || "major";

    // Parallel: same tonic, opposite family quality
    const parallel = fam === "major"
      ? { tonic, scaleId: "minor", label: `${pretty(tonic)} minor` }
      : { tonic, scaleId: "major", label: `${pretty(tonic)} major` };

    // Relative: shares the key signature.
    // For any mode/pentatonic in the minor family, the parent major IS the relative major.
    // For any mode/pentatonic in the major family, the relative minor is the parent's relative minor.
    let relative;
    if (fam === "minor") {
      relative = { tonic: parent, scaleId: "major", label: `${pretty(parent)} major` };
    } else {
      const k = T.Key.majorKey(parent);
      const relMinor = (k && k.minorRelative) || T.Note.transpose(parent, "6M");
      relative = { tonic: relMinor, scaleId: "minor", label: `${pretty(relMinor)} minor` };
    }

    return {
      scale,
      notes: scale.notes,
      intervals: scale.intervals,
      degrees: scale.intervals.map(degreeLabel),
      signature: sig,
      parallel,
      relative,
      parentMajor: parent,
      family: fam,
    };
  }

  // ---- Fretboard markers ----
  // Standard tuning, low → high. MIDI of open strings.
  const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
  const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

  function fretboardMarkers(tonic, scaleId, frets) {
    const info = getKeyInfo(tonic, scaleId);
    // Map chroma (0..11) → {label, role}
    const byChroma = {};
    info.notes.forEach((n, i) => {
      const c = T.Note.chroma(n);
      if (c == null) return;
      byChroma[c] = { label: pretty(n), role: intervalToRole(info.intervals[i]) };
    });
    const out = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= frets; f++) {
        const midi = STANDARD_TUNING_MIDI[s] + f;
        const c = midi % 12;
        if (byChroma[c]) {
          out.push({ s, f, label: byChroma[c].label, kind: byChroma[c].role });
        }
      }
    }
    return out;
  }

  // =========================================================================
  // Diatonic chords
  // For each scale degree, build a triad (1-3-5) or 7th (1-3-5-7) by walking
  // thirds within the parent scale. Returns chord name, quality, roman numeral,
  // function tag (T / PD / D in major-family), and note list.
  // =========================================================================
  function chordQualityTriad(root, third, fifth) {
    const t3 = T.Interval.distance(root, third);
    const t5 = T.Interval.distance(root, fifth);
    if (t3 === "3M" && t5 === "5P") return "maj";
    if (t3 === "3m" && t5 === "5P") return "min";
    if (t3 === "3m" && t5 === "5d") return "dim";
    if (t3 === "3M" && t5 === "5A") return "aug";
    return "?";
  }
  function chordQualitySeventh(triadQ, root, seventh) {
    const t7 = T.Interval.distance(root, seventh);
    if (triadQ === "maj"  && t7 === "7M") return "maj7";
    if (triadQ === "maj"  && t7 === "7m") return "7";   // dominant
    if (triadQ === "min"  && t7 === "7m") return "m7";
    if (triadQ === "min"  && t7 === "7M") return "mMaj7";
    if (triadQ === "dim"  && t7 === "7m") return "m7♭5"; // half-diminished
    if (triadQ === "dim"  && t7 === "7d") return "°7";
    if (triadQ === "aug"  && t7 === "7M") return "augMaj7";
    if (triadQ === "aug"  && t7 === "7m") return "aug7";
    return triadQ + "7";
  }

  const ROMAN = ["I","II","III","IV","V","VI","VII"];

  function romanFor(degreeIdx, quality) {
    let r = ROMAN[degreeIdx] || String(degreeIdx + 1);
    if (quality.startsWith("min") || quality === "m7" || quality === "mMaj7") {
      r = r.toLowerCase();
    } else if (quality.startsWith("dim") || quality === "°7" || quality === "m7♭5") {
      r = r.toLowerCase() + (quality.includes("7♭5") ? "ø" : "°");
    } else if (quality.startsWith("aug")) {
      r = r + "+";
    }
    if (quality.endsWith("7") || quality === "maj7" || quality === "mMaj7" || quality === "augMaj7") {
      // append 7 superscript-ish (let UI handle, plain '7' here)
      if (!r.endsWith("ø") && !r.endsWith("°")) r = r + "7";
      else r = r; // ø / ° already imply 7th
    }
    return r;
  }

  // Major-family function tags by scale degree (0-based)
  const FUNC_MAJOR = ["T","PD","T","PD","D","T","D"];
  const FUNC_MINOR = ["T","PD","T","PD","D","T","ST"]; // ST = subtonic

  function getDiatonicChords(tonic, scaleId, withSeventh = false) {
    const info = getKeyInfo(tonic, scaleId);
    const notes = info.notes;
    const N = notes.length;
    // Only build diatonic chords for 7-note (heptatonic) scales.
    // For pentatonic/blues, return null — caller can decide to skip the section.
    if (N !== 7) return null;
    const fam = FAMILY[scaleId] || "major";
    return notes.map((root, i) => {
      const third  = notes[(i + 2) % N];
      const fifth  = notes[(i + 4) % N];
      const seventh = notes[(i + 6) % N];
      const triadQ = chordQualityTriad(root, third, fifth);
      const q = withSeventh ? chordQualitySeventh(triadQ, root, seventh) : triadQ;
      const chordNotes = withSeventh ? [root, third, fifth, seventh] : [root, third, fifth];
      const roman = romanFor(i, q);
      // Pretty chord label: root + symbol
      const sym =
        q === "maj"   ? ""    :
        q === "min"   ? "m"   :
        q === "dim"   ? "°"   :
        q === "aug"   ? "+"   :
        q === "maj7"  ? "maj7" :
        q === "7"     ? "7"   :
        q === "m7"    ? "m7"  :
        q === "mMaj7" ? "m(maj7)" :
        q === "°7"    ? "°7"  :
        q === "m7♭5"  ? "m7♭5" :
        q === "augMaj7" ? "+maj7" :
        q === "aug7"  ? "+7"  : q;
      const name = pretty(root) + sym;
      const fn = (fam === "major" ? FUNC_MAJOR : FUNC_MINOR)[i] || "";
      return {
        degreeIdx: i,
        roman,
        name,
        root, third, fifth, seventh,
        quality: q,
        notes: chordNotes,
        function: fn,
      };
    });
  }

  // Map a chord (array of note names) to fretboard markers.
  // root = filled square; 3rd/5th/7th = filled circles; chord-tones only.
  function chordFretboardMarkers(chordNotes, frets) {
    if (!chordNotes || chordNotes.length === 0) return [];
    const roles = ["root","t3","t5","t7"];
    const byChroma = {};
    chordNotes.forEach((n, i) => {
      const c = T.Note.chroma(n);
      if (c == null) return;
      byChroma[c] = { label: pretty(n), role: roles[i] || "n" };
    });
    const out = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= frets; f++) {
        const midi = STANDARD_TUNING_MIDI[s] + f;
        const c = midi % 12;
        if (byChroma[c]) {
          out.push({ s, f, label: byChroma[c].label, kind: byChroma[c].role });
        }
      }
    }
    return out;
  }

  // Common progressions, by family. Each is a list of degree indices (0-based).
  const COMMON_PROGRESSIONS = {
    major: [
      { id: "I-V-vi-IV",   label: "I — V — vi — IV",   degrees: [0,4,5,3], note: "pop / four-chord" },
      { id: "I-IV-V",      label: "I — IV — V",        degrees: [0,3,4],   note: "classic three-chord" },
      { id: "ii-V-I",      label: "ii — V — I",        degrees: [1,4,0],   note: "jazz cadence" },
      { id: "vi-IV-I-V",   label: "vi — IV — I — V",   degrees: [5,3,0,4], note: "axis (minor start)" },
      { id: "I-vi-IV-V",   label: "I — vi — IV — V",   degrees: [0,5,3,4], note: "50s doo-wop" },
    ],
    minor: [
      { id: "i-VI-VII",    label: "i — VI — VII",      degrees: [0,5,6], note: "epic / cinematic" },
      { id: "i-iv-V",      label: "i — iv — V",        degrees: [0,3,4], note: "classical minor" },
      { id: "i-VII-VI-V",  label: "i — VII — VI — V",  degrees: [0,6,5,4], note: "andalusian" },
      { id: "ii-V-i",      label: "iiø — V — i",       degrees: [1,4,0], note: "minor jazz cadence" },
    ],
  };

  // =========================================================================
  // F5 \u2014 Closed triad voicings
  // For a given triad (3 notes), return all closed voicings on each of the 4
  // string sets (1\u20112\u20113, 2\u20113\u20114, 3\u20114\u20115, 4\u20115\u20116 from high\u2011e on top) and each of
  // the 3 inversions (root, 1st, 2nd) within the fret range.
  // Strings here are indexed 0=low\u2011E ... 5=high\u2011e (matches Fretboard.jsx).
  // =========================================================================
  const STRING_SETS = [
    { id: "1-2-3", strings: [5, 4, 3] }, // high\u2011e, B, G
    { id: "2-3-4", strings: [4, 3, 2] }, // B, G, D
    { id: "3-4-5", strings: [3, 2, 1] }, // G, D, A
    { id: "4-5-6", strings: [2, 1, 0] }, // D, A, low\u2011E
  ];
  const INVERSIONS = [
    { id: "root", label: "root" },
    { id: "1st",  label: "1st" },
    { id: "2nd",  label: "2nd" },
  ];

  function findFret(stringIdx, chroma, maxFret) {
    // Lowest fret on stringIdx that plays this pitch class.
    const open = STANDARD_TUNING_MIDI[stringIdx] % 12;
    let f = ((chroma - open) % 12 + 12) % 12;
    const out = [];
    while (f <= maxFret) { out.push(f); f += 12; }
    return out;
  }

  // chord = { root, third, fifth } (note names, e.g. "C", "E", "G")
  function closedTriadVoicings(chord, maxFret = 22) {
    if (!chord) return [];
    const r = T.Note.chroma(chord.root);
    const t = T.Note.chroma(chord.third);
    const f5 = T.Note.chroma(chord.fifth);
    const orderedByInversion = {
      "root": [r, t, f5],   // bottom, middle, top
      "1st":  [t, f5, r],
      "2nd":  [f5, r, t],
    };
    const roleOf = (chroma) =>
      chroma === r  ? "root" :
      chroma === t  ? "t3"   :
      chroma === f5 ? "t5"   : "n";
    const noteOf = (chroma) =>
      chroma === r  ? chord.root  :
      chroma === t  ? chord.third :
      chroma === f5 ? chord.fifth : "";

    const out = [];

    STRING_SETS.forEach(set => {
      const [sHi, sMid, sLo] = set.strings; // strings is [high, mid, low]
      INVERSIONS.forEach(inv => {
        const [cBottom, cMid, cTop] = orderedByInversion[inv.id];
        // Try every fret on the LOW string that has the bottom note; for each,
        // find the smallest closed-voicing match upward.
        // Skip open strings to keep mini-diagrams simple — every voicing
        // lives in a fretted window, even if a higher-position option.
        const lowFrets = findFret(sLo, cBottom, maxFret).filter(f => f >= 1);
        lowFrets.forEach(fLo => {
          const midi_lo = STANDARD_TUNING_MIDI[sLo] + fLo;
          // mid: lowest fret on sMid >= midi_lo with class cMid
          const midFrets = findFret(sMid, cMid, maxFret).filter(f => f >= 1);
          let pickedMid = null;
          for (const fm of midFrets) {
            const midi_m = STANDARD_TUNING_MIDI[sMid] + fm;
            if (midi_m < midi_lo) continue;
            if (midi_m - midi_lo > 8) continue; // closed voicing
            pickedMid = { f: fm, midi: midi_m };
            break;
          }
          if (!pickedMid) return;
          // top: lowest fret on sHi >= pickedMid.midi with class cTop
          const topFrets = findFret(sHi, cTop, maxFret).filter(f => f >= 1);
          let pickedTop = null;
          for (const ft of topFrets) {
            const midi_t = STANDARD_TUNING_MIDI[sHi] + ft;
            if (midi_t < pickedMid.midi) continue;
            if (midi_t - midi_lo > 12) continue; // within an octave
            pickedTop = { f: ft, midi: midi_t };
            break;
          }
          if (!pickedTop) return;
          const minF = Math.min(fLo, pickedMid.f, pickedTop.f);
          const maxF = Math.max(fLo, pickedMid.f, pickedTop.f);
          // Reject voicings spanning more than 4 frets (not playable closed)
          if (maxF - minF > 4) return;
          out.push({
            stringSet: set.id,
            inversion: inv.id,
            startFret: minF,
            endFret: maxF,
            positions: [
              { s: sLo,  f: fLo,            note: noteOf(cBottom), role: roleOf(cBottom) },
              { s: sMid, f: pickedMid.f,    note: noteOf(cMid),    role: roleOf(cMid)    },
              { s: sHi,  f: pickedTop.f,    note: noteOf(cTop),    role: roleOf(cTop)    },
            ],
          });
        });
      });
    });

    return out;
  }

  // =========================================================================
  // F6 \u2014 Circle of fifths data
  // 12 major keys in 5ths order, each with relative minor + signature.
  // Same array can be read backwards for the circle of fourths.
  // =========================================================================
  const CIRCLE_FIFTHS = [
    { major: "C",  minor: "A"  },
    { major: "G",  minor: "E"  },
    { major: "D",  minor: "B"  },
    { major: "A",  minor: "F#" },
    { major: "E",  minor: "C#" },
    { major: "B",  minor: "G#" },
    { major: "F#", minor: "D#" },
    { major: "Db", minor: "Bb" },
    { major: "Ab", minor: "F"  },
    { major: "Eb", minor: "C"  },
    { major: "Bb", minor: "G"  },
    { major: "F",  minor: "D"  },
  ];

  function circleKeys() {
    return CIRCLE_FIFTHS.map(k => {
      const sig = signatureOf(k.major);
      return {
        major: k.major,
        minor: k.minor,
        majorLabel: pretty(k.major),
        minorLabel: pretty(k.minor) + "m",
        signature: sig,
      };
    });
  }

  // =========================================================================
  // F7 \u2014 Modal interchange / borrowed chords
  // For a current MAJOR key, list chords borrowed from each parallel mode.
  // (For a current MINOR key we mirror with parallel-major-direction sources.)
  // Each row: { roman, romanPretty, degree, quality, name, notes, function }
  // =========================================================================

  // For a MAJOR home key (we'll mirror for minor below).
  // degree = interval from tonic to chord root.
  // quality = "maj" | "min" | "dim" | "aug".
  // Triad notes are then computed at runtime.
  const BORROWED_FROM_MAJOR_HOME = {
    aeolian: [
      { roman: "\u266dIII", degree: "3m", quality: "maj", function: "chromatic mediant" },
      { roman: "\u266dVI",  degree: "6m", quality: "maj", function: "chromatic mediant" },
      { roman: "\u266dVII", degree: "7m", quality: "maj", function: "subtonic" },
      { roman: "iv",        degree: "4P", quality: "min", function: "minor predominant" },
      { roman: "v",         degree: "5P", quality: "min", function: "weakened dominant" },
      { roman: "ii\u00b0",  degree: "2M", quality: "dim", function: "dark predominant" },
    ],
    dorian: [
      { roman: "II",        degree: "2M", quality: "maj", function: "bright predominant" },
      { roman: "\u266dIII", degree: "3m", quality: "maj", function: "chromatic mediant" },
      { roman: "\u266dVII", degree: "7m", quality: "maj", function: "subtonic" },
    ],
    phrygian: [
      { roman: "\u266dII",  degree: "2m", quality: "maj", function: "Neapolitan" },
      { roman: "\u266dIII", degree: "3m", quality: "maj", function: "chromatic mediant" },
      { roman: "iv",        degree: "4P", quality: "min", function: "minor predominant" },
      { roman: "\u266dvii", degree: "7m", quality: "min", function: "minor subtonic" },
    ],
    lydian: [
      { roman: "II",        degree: "2M", quality: "maj", function: "bright predominant" },
      { roman: "\u266fiv\u00b0", degree: "4A", quality: "dim", function: "lydian leading\u2011tone" },
    ],
    mixolydian: [
      { roman: "\u266dVII", degree: "7m", quality: "maj", function: "subtonic" },
      { roman: "v",         degree: "5P", quality: "min", function: "weakened dominant" },
    ],
    "harmonic minor": [
      { roman: "iv",        degree: "4P", quality: "min", function: "minor predominant" },
      { roman: "\u266dVI",  degree: "6m", quality: "maj", function: "chromatic mediant" },
      { roman: "\u266dIII+", degree: "3m", quality: "aug", function: "augmented mediant" },
    ],
    "melodic minor": [
      { roman: "\u266dIII+", degree: "3m", quality: "aug", function: "augmented mediant" },
      { roman: "vi\u00b0",  degree: "6M", quality: "dim", function: "diminished submediant" },
    ],
  };

  // For a MINOR home key, the sources flip: borrow from parallel major and
  // the bright modes. Degrees are still expressed relative to the minor tonic.
  const BORROWED_FROM_MINOR_HOME = {
    "parallel major (Ionian)": [
      { roman: "I",        degree: "1P", quality: "maj", function: "Picardy tonic" },
      { roman: "III",      degree: "3M", quality: "maj", function: "raised mediant" },
      { roman: "IV",       degree: "4P", quality: "maj", function: "bright predominant" },
      { roman: "vi",       degree: "6M", quality: "min", function: "raised submediant" },
    ],
    dorian: [
      { roman: "IV",       degree: "4P", quality: "maj", function: "bright predominant" },
      { roman: "ii",       degree: "2M", quality: "min", function: "dorian supertonic" },
    ],
    phrygian: [
      { roman: "\u266dII", degree: "2m", quality: "maj", function: "Neapolitan" },
      { roman: "\u266dvii", degree: "7m", quality: "min", function: "minor subtonic" },
    ],
    "harmonic minor": [
      { roman: "V",        degree: "5P", quality: "maj", function: "secondary\u2011strength dominant" },
      { roman: "vii\u00b0", degree: "7M", quality: "dim", function: "leading\u2011tone" },
    ],
    "melodic minor": [
      { roman: "IV",       degree: "4P", quality: "maj", function: "bright predominant" },
      { roman: "vi\u00b0", degree: "6M", quality: "dim", function: "diminished submediant" },
    ],
  };

  const QUALITY_INTERVALS = {
    maj: ["3M", "5P"],
    min: ["3m", "5P"],
    dim: ["3m", "5d"],
    aug: ["3M", "5A"],
  };
  const QUALITY_SYMBOL = {
    maj: "", min: "m", dim: "\u00b0", aug: "+",
  };

  function buildBorrowedChord(tonic, def) {
    const root = T.Note.transpose(tonic, def.degree);
    const [i3, i5] = QUALITY_INTERVALS[def.quality];
    const third = T.Note.transpose(root, i3);
    const fifth = T.Note.transpose(root, i5);
    const sym = QUALITY_SYMBOL[def.quality];
    return {
      roman: def.roman,
      function: def.function,
      quality: def.quality,
      name: pretty(root) + sym,
      root, third, fifth,
      notes: [root, third, fifth],
    };
  }

  function borrowedChords(tonic, scaleId) {
    const fam = FAMILY[scaleId] || "major";
    const sources = fam === "major" ? BORROWED_FROM_MAJOR_HOME : BORROWED_FROM_MINOR_HOME;
    const out = {};
    Object.keys(sources).forEach(srcName => {
      out[srcName] = sources[srcName].map(def => buildBorrowedChord(tonic, def));
    });
    return out;
  }

  // =========================================================================
  // CAGED shape windows
  // Each shape, when applied to a key with tonic chroma R, occupies a fret
  // window relative to R. Windows are derived from where the open shape's
  // chord tones sit on the neck, so e.g. the C-shape of G major lives at
  // frets 7-10. We wrap an octave down so e.g. the G-shape of G major
  // surfaces at the open position rather than fret 12.
  // =========================================================================
  const CAGED_WINDOWS = {
    C: { lo: 0,  hi: 3  },
    A: { lo: 3,  hi: 5  },
    G: { lo: 5,  hi: 8  },
    E: { lo: 8,  hi: 11 },
    D: { lo: 10, hi: 13 },
  };
  const CAGED_SHAPE_ORDER = ["C", "A", "G", "E", "D"];

  function cagedWindowFor(tonic, shapeId) {
    const R = T.Note.chroma(tonic);
    const base = CAGED_WINDOWS[shapeId];
    let lo = R + base.lo;
    let hi = R + base.hi;
    // Drop the whole shape an octave if it'd sit entirely above fret 12.
    while (lo >= 12 && hi - 12 >= 0) { lo -= 12; hi -= 12; }
    return { lo, hi };
  }

  function getCAGEDMarkers(tonic, scaleId, shapeId, maxFret) {
    const info = getKeyInfo(tonic, scaleId);
    if (info.notes.length !== 7) return null; // heptatonic only
    const { lo, hi } = cagedWindowFor(tonic, shapeId);

    // chroma → { label, role }, where role is root/t3/t5 for I-chord tones
    // and 'n' for every other scale tone (including the 7th degree).
    const roleByChroma = {};
    info.notes.forEach((n, i) => {
      const c = T.Note.chroma(n);
      let role = intervalToRole(info.intervals[i]);
      if (role !== "root" && role !== "t3" && role !== "t5") role = "n";
      roleByChroma[c] = { label: pretty(n), role };
    });

    const lo2 = Math.max(0, lo);
    const hi2 = Math.min(maxFret, hi);
    const markers = [];
    for (let s = 0; s < 6; s++) {
      const open = STANDARD_TUNING_MIDI[s] % 12;
      for (let f = lo2; f <= hi2; f++) {
        const c = (open + f) % 12;
        const r = roleByChroma[c];
        if (r) markers.push({ s, f, label: r.label, kind: r.role });
      }
    }
    return markers;
  }

  // =========================================================================
  // STAGE 5 — Extended harmony
  // 9ths · 11ths · 13ths · drop-2 seventh voicings · upper-structure triads
  // =========================================================================

  // Tensions, in stacking order. interval = interval from the chord root.
  // group is for mutual-exclusion in the toggle UI (only one ♭9/9/♯9 at once).
  const EXTENSIONS = [
    { id: "9",   label: "9",   interval: "9M",  group: "9",  role: "ext" },
    { id: "b9",  label: "♭9",  interval: "9m",  group: "9",  role: "ext" },
    { id: "#9",  label: "♯9",  interval: "9A",  group: "9",  role: "ext" },
    { id: "11",  label: "11",  interval: "11P", group: "11", role: "ext" },
    { id: "#11", label: "♯11", interval: "11A", group: "11", role: "ext" },
    { id: "b13", label: "♭13", interval: "13m", group: "13", role: "ext" },
    { id: "13",  label: "13",  interval: "13M", group: "13", role: "ext" },
  ];

  // Per-quality availability. Status is:
  //   "ok"    — standard, common
  //   "avoid" — playable but classically marked "avoid note" (e.g. nat-11 on maj7)
  //   "off"   — clashes with the chord quality; control is disabled
  const EXTENSION_AVAILABILITY = {
    "maj7":  { "9":"ok",    "b9":"off",  "#9":"off",  "11":"avoid", "#11":"ok",  "b13":"off", "13":"ok"   },
    "7":     { "9":"ok",    "b9":"ok",   "#9":"ok",   "11":"avoid", "#11":"ok",  "b13":"ok",  "13":"ok"   },
    "m7":    { "9":"ok",    "b9":"off",  "#9":"off",  "11":"ok",    "#11":"off", "b13":"ok",  "13":"ok"   },
    "m7♭5":  { "9":"off",   "b9":"ok",   "#9":"off",  "11":"ok",    "#11":"off", "b13":"ok",  "13":"off"  },
    "mMaj7": { "9":"ok",    "b9":"off",  "#9":"off",  "11":"ok",    "#11":"off", "b13":"ok",  "13":"ok"   },
    "°7":    { "9":"ok",    "b9":"ok",   "#9":"off",  "11":"ok",    "#11":"off", "b13":"off", "13":"ok"   },
    "+maj7": { "9":"ok",    "b9":"off",  "#9":"off",  "11":"off",   "#11":"ok",  "b13":"off", "13":"off"  },
    "+7":    { "9":"ok",    "b9":"ok",   "#9":"ok",   "11":"off",   "#11":"ok",  "b13":"off", "13":"off"  },
  };

  // Promote a triad quality to a sensible default 7th chord.
  function promoteToSeventh(quality) {
    switch (quality) {
      case "maj": return "maj7";
      case "min": return "m7";
      case "dim": return "m7♭5";   // half-diminished by default
      case "aug": return "+7";
      default:    return quality;  // already a 7th-class quality
    }
  }

  function extensionsAvailable(quality) {
    const q = promoteToSeventh(quality);
    return EXTENSION_AVAILABILITY[q] || EXTENSION_AVAILABILITY["7"];
  }

  // Default seventh interval for triads that lack a precomputed seventh
  // (e.g. borrowed triads from the interchange panel).
  function seventhIntervalFor(quality) {
    switch (quality) {
      case "maj":    return "7M";   // promote major triad as maj7 (NB: NOT dominant)
      case "min":    return "7m";
      case "dim":    return "7m";   // half-diminished default
      case "aug":    return "7M";
      case "maj7":   return "7M";
      case "7":      return "7m";
      case "m7":     return "7m";
      case "m7♭5":   return "7m";
      case "mMaj7":  return "7M";
      case "°7":     return "7d";
      case "+maj7":  return "7M";
      case "+7":     return "7m";
      default:       return "7m";
    }
  }

  // Apply group-exclusion when toggling a tension. Only one member of each
  // group (9 / 11 / 13) can be active at a time.
  function toggleExtension(activeIds, id) {
    const def = EXTENSIONS.find(e => e.id === id);
    if (!def) return activeIds;
    if (activeIds.includes(id)) {
      return activeIds.filter(x => x !== id);
    }
    const sameGroup = EXTENSIONS.filter(e => e.group === def.group).map(e => e.id);
    return activeIds.filter(x => !sameGroup.includes(x)).concat(id);
  }

  // Pretty-print a base 7th-quality as a chord-symbol fragment.
  function baseSymbolFor(quality) {
    switch (quality) {
      case "maj7":   return "maj7";
      case "7":      return "7";
      case "m7":     return "m7";
      case "m7♭5":   return "m7♭5";
      case "mMaj7":  return "m(maj7)";
      case "°7":     return "°7";
      case "+maj7":  return "+maj7";
      case "+7":     return "+7";
      default:       return quality;
    }
  }

  // Compute the extended chord: notes added, chord-symbol, UST match.
  function extendChord(focusedChord, activeIds = []) {
    if (!focusedChord) return null;
    const baseQ = promoteToSeventh(focusedChord.quality);
    const baseSym = baseSymbolFor(baseQ);
    const root = focusedChord.root;
    const seventh = focusedChord.seventh
      || T.Note.transpose(root, seventhIntervalFor(focusedChord.quality));

    const activeDefs = activeIds
      .map(id => EXTENSIONS.find(e => e.id === id))
      .filter(Boolean);

    const extNotes = activeDefs.map(e => ({
      id: e.id,
      label: e.label,
      note: T.Note.transpose(root, e.interval),
      role: e.role,
    }));

    // Compose a chord symbol: highest natural extension subsumes lower naturals.
    let highestNatural = 0;
    const alterations = [];
    for (const e of activeDefs) {
      if (e.id === "9")    highestNatural = Math.max(highestNatural, 9);
      if (e.id === "11")   highestNatural = Math.max(highestNatural, 11);
      if (e.id === "13")   highestNatural = Math.max(highestNatural, 13);
      if (e.id === "b9")   alterations.push("♭9");
      if (e.id === "#9")   alterations.push("♯9");
      if (e.id === "#11")  alterations.push("♯11");
      if (e.id === "b13")  alterations.push("♭13");
    }

    let head;
    if (highestNatural === 0) {
      head = baseSym;
    } else {
      const n = String(highestNatural);
      head =
        baseQ === "maj7"   ? "maj" + n :
        baseQ === "7"      ? n :
        baseQ === "m7"     ? "m" + n :
        baseQ === "m7♭5"   ? "m" + n + "♭5" :
        baseQ === "mMaj7"  ? "m(maj" + n + ")" :
        baseQ === "°7"     ? "°" + n :
        baseQ === "+maj7"  ? "+maj" + n :
        baseQ === "+7"     ? "+" + n : baseSym;
    }
    const tail = alterations.length ? "(" + alterations.join(",") + ")" : "";
    const name = pretty(root) + head + tail;

    const upperStructure = upperStructureFor(focusedChord, activeIds);

    return {
      root,
      third: focusedChord.third,
      fifth: focusedChord.fifth,
      seventh,
      baseQuality: baseQ,
      chordNotes: [root, focusedChord.third, focusedChord.fifth, seventh],
      extNotes,
      activeIds: activeDefs.map(e => e.id),
      name,
      baseName: pretty(root) + baseSym,
    };
  }

  // =========================================================================
  // Upper-structure triads (canonical jazz USTs)
  // Given a focused 7th chord + active extensions, name the major/minor triad
  // sitting on top of root-3-7 that produces this sound.
  // =========================================================================
  function upperStructureFor(focusedChord, activeIds) {
    if (!activeIds || activeIds.length < 2) return null;
    const has = id => activeIds.includes(id);
    const q = promoteToSeventh(focusedChord.quality);
    const root = focusedChord.root;

    if (q === "7") {
      // ranked by familiarity
      if (has("9")  && has("#11") && has("13"))  return mkUST(root, "2M", "maj", "II",   "lydian dominant · D/C₇");
      if (has("b9") && has("#11") && has("b13")) return mkUST(root, "2m", "maj", "♭II",  "altered · D♭/C₇");
      if (has("#9") && has("b13"))               return mkUST(root, "3m", "maj", "♭III", "altered (♯9 ♭13)");
      if (has("b9") && has("b13"))               return mkUST(root, "6m", "maj", "♭VI",  "altered ♭9");
      if (has("9")  && has("13"))                return mkUST(root, "6M", "maj", "VI",   "raw 13 colour");
    }
    if (q === "maj7") {
      if (has("9")  && has("#11"))               return mkUST(root, "2M", "maj", "II",   "lydian maj7");
      if (has("9")  && has("13"))                return mkUST(root, "5P", "min", "v",    "maj13 colour");
    }
    if (q === "m7") {
      if (has("9")  && has("11") && has("13"))   return mkUST(root, "5P", "min", "v",    "dorian (m13)");
      if (has("11") && has("13"))                return mkUST(root, "7m", "maj", "♭VII", "m11/13 colour");
    }
    return null;
  }
  function mkUST(chordRoot, interval, triadQuality, roman, flavor) {
    const triadRoot = T.Note.transpose(chordRoot, interval);
    const sym = triadQuality === "min" ? "m" : "";
    return {
      triad: pretty(triadRoot) + sym,
      slash: pretty(triadRoot) + sym + "/" + pretty(chordRoot),
      roman,
      flavor,
    };
  }

  // =========================================================================
  // Drop-2 seventh-chord voicings
  // 4 inversions × 3 adjacent 4-string sets.
  // =========================================================================
  const DROP2_STRING_SETS = [
    { id: "6-5-4-3", strings: [0, 1, 2, 3], label: "bass · E A D G"   },
    { id: "5-4-3-2", strings: [1, 2, 3, 4], label: "middle · A D G B" },
    { id: "4-3-2-1", strings: [2, 3, 4, 5], label: "treble · D G B e" },
  ];
  const DROP2_INVERSIONS = [
    { id: "root", label: "root" },
    { id: "1st",  label: "1st"  },
    { id: "2nd",  label: "2nd"  },
    { id: "3rd",  label: "3rd"  },
  ];

  // Drop-2 inversions (bottom → top):
  //   root close R-3-5-7  →  drop 5  →  5 R 3 7
  //   1st  close 3-5-7-R  →  drop 7  →  7 3 5 R
  //   2nd  close 5-7-R-3  →  drop R  →  R 5 7 3
  //   3rd  close 7-R-3-5  →  drop 3  →  3 7 R 5
  function dropTwoSeventhVoicings(chord, maxFret = 22) {
    if (!chord) return [];
    const r  = T.Note.chroma(chord.root);
    const t3 = T.Note.chroma(chord.third);
    const t5 = T.Note.chroma(chord.fifth);
    const sevenName = chord.seventh
      || T.Note.transpose(chord.root, seventhIntervalFor(chord.quality));
    const t7 = T.Note.chroma(sevenName);

    const byInv = {
      "root": [t5, r,  t3, t7],
      "1st":  [t7, t3, t5, r ],
      "2nd":  [r,  t5, t7, t3],
      "3rd":  [t3, t7, r,  t5],
    };
    const roleOf = c =>
      c === r  ? "root" :
      c === t3 ? "t3"   :
      c === t5 ? "t5"   :
      c === t7 ? "t7"   : "n";
    const noteOf = c =>
      c === r  ? chord.root :
      c === t3 ? chord.third :
      c === t5 ? chord.fifth :
      c === t7 ? sevenName : "";

    const out = [];
    DROP2_STRING_SETS.forEach(set => {
      DROP2_INVERSIONS.forEach(inv => {
        const seq = byInv[inv.id];
        const [s0, s1, s2, s3] = set.strings;
        const bottomFrets = findFret(s0, seq[0], maxFret).filter(f => f >= 1);
        for (const f0 of bottomFrets) {
          const m0 = STANDARD_TUNING_MIDI[s0] + f0;
          const picks = [{ s: s0, f: f0, midi: m0 }];
          let ok = true;
          for (let i = 1; i < 4; i++) {
            const sN = set.strings[i];
            const cand = findFret(sN, seq[i], maxFret)
              .filter(f => f >= 1)
              .map(f => ({ s: sN, f, midi: STANDARD_TUNING_MIDI[sN] + f }))
              .find(p => p.midi > picks[i - 1].midi && p.midi - picks[i - 1].midi <= 9);
            if (!cand) { ok = false; break; }
            picks.push(cand);
          }
          if (!ok) continue;
          const frets = picks.map(p => p.f);
          const minF = Math.min(...frets);
          const maxF = Math.max(...frets);
          if (maxF - minF > 4) continue;     // playable closed-window span
          out.push({
            stringSet: set.id,
            inversion: inv.id,
            startFret: minF,
            endFret: maxF,
            positions: picks.map(p => {
              const c = (STANDARD_TUNING_MIDI[p.s] + p.f) % 12;
              return { s: p.s, f: p.f, note: noteOf(c), role: roleOf(c) };
            }),
          });
          break; // lowest-position voicing per (set, inversion)
        }
      });
    });
    return out;
  }

  // Pick the lowest-fret drop-2 voicing per (string set × inversion) into a
  // grid keyed by `${setId}/${invId}` — analogous to pickGridVoicings().
  function pickDrop2Grid(chord, maxFret) {
    const all = dropTwoSeventhVoicings(chord, maxFret);
    const grid = {};
    for (const v of all) {
      const k = `${v.stringSet}/${v.inversion}`;
      const existing = grid[k];
      if (!existing || v.startFret < existing.startFret) grid[k] = v;
    }
    return grid;
  }

  // Build fretboard markers for a base 7th chord + its extension notes.
  // Base tones use root/t3/t5/t7. Extension tones use the generic "ext" kind.
  function extendedChordFretboardMarkers(extObj, frets) {
    if (!extObj) return [];
    const byChroma = {};
    const baseRoles = ["root", "t3", "t5", "t7"];
    extObj.chordNotes.forEach((n, i) => {
      const c = T.Note.chroma(n);
      if (c == null) return;
      byChroma[c] = { label: pretty(n), kind: baseRoles[i] };
    });
    extObj.extNotes.forEach(e => {
      const c = T.Note.chroma(e.note);
      if (c == null) return;
      // Base chord tones win if there's a chroma collision.
      if (byChroma[c]) return;
      byChroma[c] = { label: pretty(e.note), kind: "ext" };
    });

    const out = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= frets; f++) {
        const midi = STANDARD_TUNING_MIDI[s] + f;
        const c = midi % 12;
        if (byChroma[c]) out.push({ s, f, label: byChroma[c].label, kind: byChroma[c].kind });
      }
    }
    return out;
  }

  window.Theory = {
    pretty,
    degreeLabel,
    intervalToRole,
    getScale,
    getKeyInfo,
    parentMajorTonic,
    signatureOf,
    fretboardMarkers,
    chordFretboardMarkers,
    getDiatonicChords,
    COMMON_PROGRESSIONS,
    closedTriadVoicings,
    STRING_SETS,
    INVERSIONS,
    circleKeys,
    CIRCLE_FIFTHS,
    borrowedChords,
    cagedWindowFor,
    getCAGEDMarkers,
    CAGED_SHAPE_ORDER,
    CAGED_WINDOWS,
    STANDARD_TUNING_MIDI,
    STRING_NAMES,
    SCALE_NAMES,
    FAMILY,
    enharmonic,
    // Stage 5 — extended harmony
    EXTENSIONS,
    EXTENSION_AVAILABILITY,
    DROP2_STRING_SETS,
    DROP2_INVERSIONS,
    extensionsAvailable,
    promoteToSeventh,
    seventhIntervalFor,
    baseSymbolFor,
    toggleExtension,
    extendChord,
    upperStructureFor,
    dropTwoSeventhVoicings,
    pickDrop2Grid,
    extendedChordFretboardMarkers,
  };
})();
