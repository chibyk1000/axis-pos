import { useState, useCallback } from "react";
import { RefreshCw, Save, HelpCircle, Minus, Plus, Check } from "lucide-react";
import { DEFAULT_SECURITY_SECTIONS } from "@/lib/security";

/* -------------------------------------------------------------------------- */
/*                              TYPES                                         */
/* -------------------------------------------------------------------------- */

export type PermissionItem = {
  id: string;
  label: string;
  value: number;
  hasHelp?: boolean;
  helpText?: string;
};

type Section = {
  id: string;
  label: string;
  color: string;
  items: PermissionItem[];
};

// const DEFAULT_SECTIONS: Section[] = DEFAULT_SECURITY_SECTIONS;

/* -------------------------------------------------------------------------- */
/*                           TOOLTIP                                          */
/* -------------------------------------------------------------------------- */

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-slate-500 hover:text-sky-400 transition-colors"
      >
        <HelpCircle size={13} />
      </button>
      {show && (
        <span className="absolute left-5 top-0 z-50 w-52 bg-slate-100 dark:bg-slate-700 border border-slate-600 text-xs text-slate-800 dark:text-slate-200 rounded px-2.5 py-1.5 shadow-lg pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                         PERMISSION ROW                                     */
/* -------------------------------------------------------------------------- */

function PermissionRow({
  item,
  onChange,
}: {
  item: PermissionItem;
  onChange: (id: string, delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-700/40 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-slate-800 dark:text-slate-200">
          {item.label}
        </span>
        {item.hasHelp && item.helpText && <Tooltip text={item.helpText} />}
      </div>
      <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-600 rounded overflow-hidden shrink-0">
        <button
          onClick={() => onChange(item.id, -1)}
          className="w-7 h-6 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700 transition-colors border-r border-slate-600"
        >
          <Minus size={12} />
        </button>
        <div className="w-8 h-6 flex items-center justify-center text-xs font-mono font-medium text-slate-800 dark:text-slate-200 select-none">
          {item.value}
        </div>
        <button
          onClick={() => onChange(item.id, 1)}
          className="w-7 h-6 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700 transition-colors border-l border-slate-600"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          SECTION BLOCK                                     */
/* -------------------------------------------------------------------------- */

function SectionBlock({
  section,
  onChange,
}: {
  section: Section;
  onChange: (sectionId: string, itemId: string, delta: number) => void;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
      {/* Header */}
      <div
        className={`${section.color} px-4 py-2 flex items-center justify-between`}
      >
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          {section.label}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() =>
              section.items.forEach((i) => onChange(section.id, i.id, -i.value))
            }
            title="Reset all to 0"
            className="text-xs text-slate-900 dark:text-white/70 hover:text-slate-900 dark:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() =>
              section.items.forEach((i) =>
                onChange(section.id, i.id, 9 - i.value),
              )
            }
            title="Set all to 9"
            className="text-xs text-slate-900 dark:text-white/70 hover:text-slate-900 dark:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
          >
            Set 9
          </button>
        </div>
      </div>

      {/* Grid of rows */}
      <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
        {section.items.map((item) => (
          <PermissionRow
            key={item.id}
            item={item}
            onChange={(id, delta) => onChange(section.id, id, delta)}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        MAIN COMPONENT                                      */
/* -------------------------------------------------------------------------- */

export default function AccessLevelSettings() {
  const [sections, setSections] = useState<Section[]>(
    DEFAULT_SECURITY_SECTIONS,
  );
  const [saved, setSaved] = useState(false);

  const handleChange = useCallback(
    (sectionId: string, itemId: string, delta: number) => {
      setSections((prev) =>
        prev.map((s) =>
          s.id !== sectionId
            ? s
            : {
                ...s,
                items: s.items.map((item) =>
                  item.id !== itemId
                    ? item
                    : {
                        ...item,
                        value: Math.max(0, Math.min(9, item.value + delta)),
                      },
                ),
              },
        ),
      );
      setSaved(false);
    },
    [],
  );

  function handleSave() {
    // TODO: persist to db — e.g. a settings table keyed by permission id
    // await db.insert(settings).values(flatRows).onConflictDoUpdate(...)
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleRefresh() {
    setSections(DEFAULT_SECURITY_SECTIONS);
    setSaved(false);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button
          onClick={handleRefresh}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700 rounded transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        <button
          onClick={handleSave}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs rounded transition-colors ${
            saved
              ? "text-emerald-400 bg-emerald-400/10"
              : "text-sky-400 hover:text-sky-300 hover:bg-slate-100 dark:bg-slate-700"
          }`}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "Saved" : "Save"}
        </button>
        <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700 rounded transition-colors ml-auto">
          <HelpCircle size={16} />
          Help
        </button>
      </div>

      {/* Description */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
        <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">
          Set access level for predefined operations
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Users with an access level equal to or higher than the required level
          can perform the operation. Users below the threshold will be prompted
          to authenticate with a higher-level account.
        </p>
      </div>

      {/* Legend */}
      <div className="px-6 py-2 flex items-center gap-6 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <span className="font-medium text-slate-500 dark:text-slate-400">
          Quick reference:
        </span>
        {[
          { label: "0 — everyone", color: "bg-slate-500" },
          { label: "1-4 — cashier", color: "bg-emerald-600" },
          { label: "5-7 — manager", color: "bg-sky-600" },
          { label: "8-9 — admin", color: "bg-violet-600" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  );
}
