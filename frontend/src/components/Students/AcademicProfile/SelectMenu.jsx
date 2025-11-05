import React, { useEffect, useMemo, useRef, useState } from "react";

const SelectMenu = ({
  value,
  onChange,
  options = [], // [{ value, label, disabled? }]
  placeholder = "Select…",
  searchable = true,
  disabled = false,
  maxHeight = 256, // px
  emptyText = "No options",
  ariaLabel = "Select menu",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  // Click outside to close
  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery("");
    else {
      // focus input when opened
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const selectOption = (o) => {
    if (o?.disabled) return;
    onChange?.(o?.value ?? null);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, filtered.length - 1);
      setActiveIndex(next);
      listRef.current?.children?.[next]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(activeIndex - 1, 0);
      setActiveIndex(prev);
      listRef.current?.children?.[prev]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) selectOption(item);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full" onKeyDown={onKeyDown}>
      {/* Input / trigger (matches CourseListSelector styling) */}
      <div
        role="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        tabIndex={0}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full px-3 py-2 border rounded-lg bg-white text-sm cursor-pointer
          ${
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "focus-within:ring-2 focus-within:ring-[#1E3A8A] focus-within:border-transparent"
          }
          border-gray-300 focus:outline-none`}
      >
        {searchable ? (
          <input
            ref={inputRef}
            value={open ? query : selected?.label ?? ""}
            onChange={(e) => setQuery(e.target.value)}
            readOnly={!open}
            placeholder={placeholder}
            className="w-full outline-none bg-transparent"
            onFocus={() => !disabled && setOpen(true)}
          />
        ) : (
          <div className={`${selected ? "text-gray-900" : "text-gray-500"}`}>
            {selected ? selected.label : placeholder}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg"
          style={{ maxHeight: maxHeight + 48, overflow: "hidden" }}
        >
          {/* Header w/ count */}
          <div className="p-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
            {filtered.length} option{filtered.length !== 1 ? "s" : ""}{" "}
            {searchable && query ? `for "${query}"` : ""}
          </div>

          {/* List */}
          <div
            ref={listRef}
            className="overflow-auto"
            style={{ maxHeight: maxHeight }}
          >
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {emptyText}
              </div>
            ) : (
              filtered.map((o, idx) => {
                const isActive = idx === activeIndex;
                const isSelected = o.value === value;
                const base =
                  "p-3 border-b border-gray-100 last:border-b-0 text-sm flex items-center";
                const enabled =
                  !o.disabled &&
                  "hover:bg-blue-50 cursor-pointer text-gray-900";
                const disabledCls =
                  o.disabled && "bg-gray-50 text-gray-400 cursor-not-allowed";
                const activeCls = isActive && !o.disabled ? "bg-blue-50" : "";
                return (
                  <div
                    key={String(o.value)}
                    className={`${base} ${enabled} ${disabledCls} ${activeCls}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectOption(o)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {o.label}
                        {isSelected && (
                          <span className="ml-2 text-xs text-blue-600">
                            (selected)
                          </span>
                        )}
                      </div>
                      {o.description && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {o.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectMenu;
