import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

type StyledSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  leadingIcon?: React.ReactNode;
  triggerClassName?: string;
  ariaLabel: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

function getMenuPosition(rect: DOMRect, optionCount: number): MenuPosition {
  const height = optionCount * 42 + 16;
  const top =
    rect.bottom + height + 8 > window.innerHeight
      ? Math.max(8, rect.top - height - 8)
      : rect.bottom + 8;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));
  return { top, left, width: rect.width };
}

const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  options,
  onChange,
  leadingIcon,
  triggerClassName = "",
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition(getMenuPosition(rect, options.length));
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = triggerRef.current?.getBoundingClientRect();
          if (rect) setMenuPosition(getMenuPosition(rect, options.length));
          setOpen(true);
        }}
        className={`relative flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white py-3 pl-4 pr-11 text-left text-sm font-semibold text-[#14226B] shadow-sm outline-none transition hover:border-blue-200 focus:border-[#1D5BFF] focus:ring-4 focus:ring-blue-100 ${triggerClassName}`}
      >
        {leadingIcon && <span className="shrink-0 text-[#1D4ED8]">{leadingIcon}</span>}
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? value}</span>
        <ChevronDown
          size={16}
          className={`absolute right-4 top-1/2 -translate-y-1/2 text-[#14226B] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            className="fixed z-[9999] rounded-xl border border-blue-200 bg-white p-2 shadow-[0_20px_50px_rgba(20,34,107,0.28)] ring-1 ring-blue-100"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  value === option.value
                    ? "bg-blue-50 text-[#1D4ED8]"
                    : "text-[#14226B] hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default StyledSelect;
