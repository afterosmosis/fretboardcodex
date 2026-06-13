/* Tiny shared collapse hook + chevron button.
   Each panel that wants to be collapsible drops a <CollapseBtn /> into its
   panel-head and gates its body on `open`. State persists per-key in
   localStorage under "fretwise:collapse:<storageKey>".
   Loaded before panel scripts so they can use window.useCollapse. */

function useCollapse(storageKey, defaultOpen = true, openOnSelectors = null) {
  const key = "fretwise:collapse:" + storageKey;
  const [open, setOpen] = React.useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defaultOpen : raw === "1";
    } catch { return defaultOpen; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, open ? "1" : "0"); } catch {}
  }, [open, key]);

  // Listen for cross-component "open this section" requests (from practice
  // routine goto buttons, etc.). If the dispatched selector matches one this
  // panel responds to, force-open.
  React.useEffect(() => {
    if (!openOnSelectors || !openOnSelectors.length) return;
    const targets = Array.isArray(openOnSelectors) ? openOnSelectors : [openOnSelectors];
    const onOpen = (e) => {
      const sel = e?.detail?.selector;
      if (sel && targets.includes(sel)) setOpen(true);
    };
    window.addEventListener("fretwise:open-section", onOpen);
    return () => window.removeEventListener("fretwise:open-section", onOpen);
  // openOnSelectors is expected to be a static array literal at the call site.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [open, setOpen];
}

function CollapseBtn({ open, onToggle, label }) {
  return (
    <button
      className="head-collapse"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? "Collapse " + (label || "panel") : "Expand " + (label || "panel")}>
      <span className="head-collapse-glyph" aria-hidden="true">{open ? "▾" : "▸"}</span>
    </button>
  );
}

window.useCollapse = useCollapse;
window.CollapseBtn = CollapseBtn;

/* =========================================================================
   Drag-to-reorder primitive
   useReorderable(id, order, setOrder) returns { sectionProps, handleProps }.
   - Spread sectionProps onto the outer <section>: sets the data-panel-id,
     wires dragenter/over/leave/drop, and toggles data-drag-over for CSS.
   - Pass handleProps into <DragHandle> (or any draggable button).
   - Uses HTML5 DnD via a custom MIME ("text/x-panel-id") so unrelated drags
     are ignored.
   ========================================================================= */

function useReorderable(id, order, setOrder) {
  const enterCount = React.useRef(0);

  const sectionProps = {
    "data-panel-id": id,
    onDragEnter: (e) => {
      if (!e.dataTransfer.types.includes("text/x-panel-id")) return;
      enterCount.current += 1;
      if (enterCount.current === 1) {
        e.currentTarget.setAttribute("data-drag-over", "true");
      }
    },
    onDragOver: (e) => {
      if (e.dataTransfer.types.includes("text/x-panel-id")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    },
    onDragLeave: () => {
      enterCount.current = Math.max(0, enterCount.current - 1);
      if (enterCount.current === 0) {
        // Find the panel root element (in case the leave fired on a child).
        const root = document.querySelector(`[data-panel-id="${id}"]`);
        if (root) root.removeAttribute("data-drag-over");
      }
    },
    onDrop: (e) => {
      e.preventDefault();
      enterCount.current = 0;
      e.currentTarget.removeAttribute("data-drag-over");
      const draggedId = e.dataTransfer.getData("text/x-panel-id");
      if (!draggedId || draggedId === id) return;
      const next = [...order];
      const fromIdx = next.indexOf(draggedId);
      const toIdx   = next.indexOf(id);
      if (fromIdx < 0 || toIdx < 0) return;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedId);
      setOrder(next);
    },
  };

  const handleProps = {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData("text/x-panel-id", id);
      e.dataTransfer.effectAllowed = "move";
      const sec = e.currentTarget.closest("[data-panel-id]");
      if (sec) sec.setAttribute("data-dragging", "true");
    },
    onDragEnd: (e) => {
      const sec = e.currentTarget.closest("[data-panel-id]");
      if (sec) sec.removeAttribute("data-dragging");
      // Clear any lingering hover marks across all panels.
      document.querySelectorAll("[data-panel-id][data-drag-over]").forEach(el => {
        el.removeAttribute("data-drag-over");
      });
    },
  };

  return { sectionProps, handleProps };
}

function DragHandle({ handleProps, label }) {
  return (
    <button
      type="button"
      className="head-drag"
      {...handleProps}
      onClick={(e) => e.preventDefault()}
      title={label ? `Drag to reorder: ${label}` : "Drag to reorder"}
      aria-label={label ? `Reorder ${label}` : "Reorder panel"}>
      <svg className="head-drag-glyph" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
        <circle cx="2" cy="3"  r="1.1" fill="currentColor" />
        <circle cx="2" cy="7"  r="1.1" fill="currentColor" />
        <circle cx="2" cy="11" r="1.1" fill="currentColor" />
        <circle cx="8" cy="3"  r="1.1" fill="currentColor" />
        <circle cx="8" cy="7"  r="1.1" fill="currentColor" />
        <circle cx="8" cy="11" r="1.1" fill="currentColor" />
      </svg>
    </button>
  );
}

window.useReorderable = useReorderable;
window.DragHandle = DragHandle;
