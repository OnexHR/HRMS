import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

type LeaveDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
};

const LeaveDatePicker: React.FC<LeaveDatePickerProps> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const displayedValue = selectedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`${label}: ${displayedValue}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setVisibleMonth(parseDate(value));
          setOpen((current) => !current);
        }}
        className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-left text-sm font-semibold text-[#14226B] shadow-sm outline-none transition hover:border-blue-200 focus:border-[#1D5BFF] focus:ring-4 focus:ring-blue-100"
      >
        <CalendarDays size={18} className="shrink-0 text-[#1D4ED8]" />
        <span className="flex-1">{displayedValue}</span>
        <ChevronDown size={16} className="shrink-0 text-[#14226B]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(19rem,calc(100vw-3rem))] rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_18px_45px_rgba(20,34,107,0.18)]"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#14226B] transition hover:bg-blue-50"
            >
              <ChevronLeft size={18} />
            </button>
            <h4 className="text-sm font-bold text-[#14226B]">
              {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h4>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#14226B] transition hover:bg-blue-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-2 text-xs font-semibold text-slate-400">
                {day}
              </span>
            ))}
            {calendarCells.map((day, index) => {
              const isSelected = day === selectedDate.getDate() &&
                month === selectedDate.getMonth() &&
                year === selectedDate.getFullYear();

              return (
                <span key={index} className="flex h-9 items-center justify-center">
                  {day ? (
                    <button
                      type="button"
                      aria-label={new Date(year, month, day).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      aria-pressed={isSelected}
                      onClick={() => {
                        onChange(toDateValue(new Date(year, month, day)));
                        setOpen(false);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${
                        isSelected
                          ? "employee-primary-action"
                          : "text-[#14226B] hover:bg-blue-50"
                      }`}
                    >
                      {day}
                    </button>
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveDatePicker;
