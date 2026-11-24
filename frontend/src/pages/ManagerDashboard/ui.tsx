import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Home, X } from "lucide-react";

/* ---------- small helpers ---------- */
export const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";

export function field(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null) return "";
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "string" ? found : "";
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function lastMonths(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (count - 1 - i));
    return date;
  });
}
export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const monthLabel = (date: Date) => date.toLocaleDateString("en-US", { month: "short" });

/* ---------- pills ---------- */
export type Tone = "blue" | "green" | "orange" | "purple" | "red" | "grey";
const pillTones: Record<Tone, { cls: string; dot: string }> = {
  green: { cls: "bg-[#E7F7EE] text-[#169A5F]", dot: "bg-[#22B573]" },
  orange: { cls: "bg-[#FFF1E3] text-[#E57F1F]", dot: "bg-[#F59E42]" },
  red: { cls: "bg-[#FFE9EA] text-[#D2444F]", dot: "bg-[#EF5B67]" },
  blue: { cls: "bg-[#E6EFFF] text-[#2F6BEA]", dot: "bg-[#2F6BEA]" },
  purple: { cls: "bg-[#EEE9FF] text-[#6B4EE0]", dot: "bg-[#7C5CF0]" },
  grey: { cls: "bg-[#F1F4F8] text-[#687990]", dot: "bg-[#A3AFC2]" },
};
export function toneFor(text: string): Tone {
  const key = text.toLowerCase();
  if (key.includes("leave")) return "orange";
  if (key.includes("reject") || key.includes("absent") || key.includes("inactive") || key.includes("review")) return "red";
  if (key.includes("pending") || key.includes("late")) return "orange";
  if (key.includes("progress")) return "blue";
  if (key.includes("not started")) return "purple";
  if (key.includes("approved") || key.includes("present") || key.includes("active") || key.includes("completed") || key.includes("excellent") || key.includes("good")) return "green";
  return "grey";
}
export function Pill({ text, tone }: { text: string; tone?: Tone }) {
  const style = pillTones[tone ?? toneFor(text)];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{text}
    </span>
  );
}

/* ---------- cards ---------- */
const statTones = {
  blue: { icon: "bg-[#E1ECFF] text-[#2F6BEA]", blob: "to-[#DCE8FF]" },
  green: { icon: "bg-[#DDF5E8] text-[#19A463]", blob: "to-[#D6F3E4]" },
  orange: { icon: "bg-[#FFE8D4] text-[#F28C38]", blob: "to-[#FFE3CB]" },
  purple: { icon: "bg-[#E8E3FF] text-[#6B4EE0]", blob: "to-[#E4DEFF]" },
  red: { icon: "bg-[#FFE1E3] text-[#E5484D]", blob: "to-[#FFE0E2]" },
};
export function StatCard({ label, value, sub, icon: Icon, tone }: { label: string; value: React.ReactNode; sub: string; icon: React.ElementType; tone: keyof typeof statTones }) {
  const style = statTones[tone];
  return (
    <section className="relative flex min-h-[100px] items-center gap-4 overflow-hidden rounded-xl border border-[#E6ECF6] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
      <div className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-transparent ${style.blob}`} />
      <div className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${style.icon}`}><Icon size={26} strokeWidth={2.2} /></div>
      <div className="relative min-w-0">
        <p className="truncate text-[28px] font-extrabold leading-none text-[#10284A]">{value}</p>
        <p className="mt-1 truncate text-[13px] font-bold text-[#10284A]">{label}</p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-[#6B7C99]">{sub}</p>
      </div>
    </section>
  );
}

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <section className={`rounded-xl border border-[#E6ECF6] bg-white p-5 shadow-[0_2px_10px_rgba(30,64,120,.05)] ${className}`}>{children}</section>
);
export const CardTitle: React.FC<{ icon: React.ElementType; title: string; action?: React.ReactNode }> = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5"><Icon size={20} className="text-[#2459A6]" /><h2 className="text-[16px] font-extrabold text-[#10284A]">{title}</h2></div>
    {action}
  </div>
);
export const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-1 text-[11px] font-bold text-[#2459A6] hover:underline">{children} <ArrowRight size={13} /></button>
);
export function QuickActions({ items }: { items: Array<[string, React.ElementType, () => void]> }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {items.map(([label, Icon, onClick]) => (
        <button key={label} type="button" onClick={onClick} className="flex h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-[#DCE6F7] bg-gradient-to-b from-[#F3F8FF] to-[#E6F0FF] px-2 text-center text-[12px] font-bold text-[#10284A] transition hover:border-[#1F63E8] hover:shadow-sm">
          <Icon size={23} className="text-[#1F63E8]" />{label}
        </button>
      ))}
    </div>
  );
}
export const Th: React.FC<{ children?: React.ReactNode; first?: boolean; last?: boolean }> = ({ children, first, last }) => (
  <th className={`py-2.5 ${first ? "rounded-l-md pl-3" : ""} ${last ? "rounded-r-md pr-3" : ""}`}>{children}</th>
);
export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => (
  <div style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#DCE9FB] to-[#C4D9F8] text-[11px] font-bold text-[#2459A6]">{initials(name)}</div>
);
export const Pager: React.FC<{ page: number; pages: number; setPage: (page: number) => void; label: string }> = ({ page, pages, setPage, label }) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#52688A]">
    <p>{label}</p>
    <div className="flex items-center gap-1">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className="grid h-8 w-8 place-items-center rounded border border-[#E1E8F2] disabled:opacity-40">‹</button>
      {Array.from({ length: Math.min(pages, 4) }, (_, i) => i + 1).map((n) => (
        <button type="button" key={n} onClick={() => setPage(n)} className={`grid h-8 w-8 place-items-center rounded ${n === page ? "bg-[#1F63E8] text-white" : "border border-[#E1E8F2]"}`}>{n}</button>
      ))}
      <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page" className="grid h-8 w-8 place-items-center rounded border border-[#E1E8F2] disabled:opacity-40">›</button>
    </div>
  </div>
);
export function SelectBox({ value, onChange, allLabel, options }: { value: string; onChange: (value: string) => void; allLabel: string; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={allLabel} className="h-10 rounded-lg border border-[#DCE6F7] bg-white px-3 text-[13px] font-semibold text-[#10284A] outline-none focus:border-[#1F63E8]">
      <option value="">{allLabel}</option>
      {options.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}
export const PrimaryButton: React.FC<{ onClick: () => void; children: React.ReactNode; outline?: boolean }> = ({ onClick, children, outline }) => (
  <button type="button" onClick={onClick} className={`flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-bold transition ${outline ? "border border-[#1F63E8] bg-white text-[#1F63E8] hover:bg-[#EEF4FF]" : "bg-[#1F63E8] text-white shadow-[0_4px_12px_rgba(31,99,232,.3)] hover:bg-[#1850C0]"}`}>{children}</button>
);

/* ---------- modal ---------- */
export function InfoModal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#10284A]/35 p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">{title}</h2><button type="button" onClick={onClose} aria-label="Close"><X size={17} /></button></div>
        <p className="mt-3 text-xs leading-5 text-[#52688A]">{message}</p>
        <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-[#1F63E8] px-4 py-2 text-xs font-bold text-white">Okay</button>
      </section>
    </div>
  );
}
export function DetailModal({ title, subtitle, rows, onClose }: { title: string; subtitle?: string; rows: Array<[string, React.ReactNode]>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#10284A]/35 p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3"><Avatar name={title} size={44} /><div><h2 className="text-sm font-extrabold">{title}</h2>{subtitle && <p className="mt-0.5 text-[11px] text-[#617492]">{subtitle}</p>}</div></div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
          {rows.map(([label, value]) => <div key={label} className="rounded-lg bg-[#F8FAFD] p-3"><dt className="text-[#8795AA]">{label}</dt><dd className="mt-1 break-words font-bold">{value}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}

/* ---------- donut ---------- */
export function Donut({ segments, max, size = 150, thickness = 22, children }: { segments: Array<{ value: number; color: string }>; max?: number; size?: number; thickness?: number; children?: React.ReactNode }) {
  const total = max ?? segments.reduce((sum, s) => sum + s.value, 0);
  let acc = 0;
  const stops = total > 0
    ? segments.map((s) => { const from = (acc / total) * 100; acc += s.value; return `${s.color} ${from}% ${(acc / total) * 100}%`; }).concat(acc < total ? [`#E8EEF8 ${(acc / total) * 100}% 100%`] : []).join(", ")
    : "#E8EEF8 0% 100%";
  return (
    <div className="grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
      <div className="grid place-items-center rounded-full bg-white text-center" style={{ width: size - thickness * 2, height: size - thickness * 2 }}>{children}</div>
    </div>
  );
}

/* ---------- line chart (SVG) ---------- */
export type Series = { name: string; color: string; values: Array<number | null>; fill?: boolean };
export function LineChart({ labels, series, yMax, yMin = 0, ticks = 4, suffix = "", showValues = true, emptyMessage, dashed }: {
  labels: string[]; series: Series[]; yMax: number; yMin?: number; ticks?: number; suffix?: string; showValues?: boolean; emptyMessage?: string; dashed?: number;
}) {
  const gid = React.useId().replace(/:/g, "");
  const W = 640, H = 230, L = 46, R = 14, T = 20, B = 36;
  const iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + 22 + ((iw - 44) * i) / Math.max(1, labels.length - 1);
  const y = (v: number) => T + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      <defs>{series.map((s, i) => <linearGradient key={i} id={`${gid}${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity=".22" /><stop offset="100%" stopColor={s.color} stopOpacity=".02" /></linearGradient>)}</defs>
      {tickValues.map((t) => (
        <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EDF1F7" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#7C8CA6">{Math.round(t * 10) / 10}{suffix}</text></g>
      ))}
      {dashed !== undefined && <line x1={L} x2={W - R} y1={y(dashed)} y2={y(dashed)} stroke="#90A9CF" strokeDasharray="5 5" />}
      {labels.map((label, i) => (
        <text key={i} x={x(i)} y={H - 16} textAnchor="middle" fontSize="11" fill="#617492">
          {label.split("\n").map((line, j) => <tspan key={j} x={x(i)} dy={j === 0 ? 0 : 13}>{line}</tspan>)}
        </text>
      ))}
      {emptyMessage ? (
        <text x={W / 2} y={T + ih / 2} textAnchor="middle" fontSize="13" fill="#8795AA">{emptyMessage}</text>
      ) : series.map((s, si) => {
        const pts = s.values.map((v, i) => (v === null ? null : { x: x(i), y: y(v), v }));
        const valid = pts.filter((p): p is { x: number; y: number; v: number } => p !== null);
        if (!valid.length) return null;
        const path = valid.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
        return (
          <g key={s.name}>
            {s.fill && <path d={`${path} L ${valid[valid.length - 1].x} ${y(yMin)} L ${valid[0].x} ${y(yMin)} Z`} fill={`url(#${gid}${si})`} />}
            <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {valid.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="4" fill={s.color} />{showValues && <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#10284A">{p.v}{suffix}</text>}</g>)}
          </g>
        );
      })}
    </svg>
  );
}
export const Legend: React.FC<{ items: Array<[string, string]> }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#4B5F7D]">
    {items.map(([name, color]) => <span key={name} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{name}</span>)}
  </div>
);

/* ---------- page shell ---------- */
export function PageShell({ crumb, title, subtitle, icon: Icon, actions, children }: { crumb: string; title: string; subtitle: string; icon: React.ElementType; actions?: React.ReactNode; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div>
      <section className="relative overflow-hidden border-b border-[#DCE8FA] bg-gradient-to-r from-[#E6F0FF] via-[#EEF4FF] to-[#D9E8FF] px-4 py-5 lg:px-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full bg-white/55" />
        <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 text-[#2F6BEA]/20 md:block"><Icon size={120} strokeWidth={1.3} /></div>
        <nav aria-label="Breadcrumb" className="relative flex items-center gap-1.5 text-[12px] text-[#4B5F7D]">
          <Home size={14} className="text-[#2459A6]" />
          <button type="button" onClick={() => navigate("/manager")} className="hover:underline">Dashboard</button>
          <ChevronRight size={12} /><span>{crumb}</span>
        </nav>
        <div className="relative mt-2 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-[28px] font-extrabold leading-none tracking-tight text-[#10284A]">{title}</h1><p className="mt-1.5 text-[13px] text-[#4B5F7D]">{subtitle}</p></div>
          {actions && <div className="relative z-[1] flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </section>
      <div className="space-y-5 px-4 py-5 lg:px-6">
        {children}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6ECF6] pb-2 pt-4 text-[12px] text-[#4B5F7D]">
          <p><strong className="mr-2 text-[#1F63E8]">OnexHR</strong>© {new Date().getFullYear()} OnexHR. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="cursor-pointer hover:underline">Privacy Policy</span><span className="text-[#C5CEDC]">|</span>
            <span className="cursor-pointer hover:underline">Terms of Service</span><span className="text-[#C5CEDC]">|</span>
            <button type="button" onClick={() => navigate("/manager/help-support")} className="hover:underline">Help</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
