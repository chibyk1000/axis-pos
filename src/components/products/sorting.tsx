import {
  ArrowLeft,
  Check,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  HelpCircle,
  X,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function SortingScreen({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onClose || (() => navigate(-1))}>
            <ArrowLeft size={16} />
          </button>
          <span className="font-semibold">Sorting</span>
        </div>
        <X
          size={18}
          className="cursor-pointer text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white"
          onClick={onClose || (() => navigate(-1))}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-850">
        <div className="flex gap-6 text-xs">
          <ToolbarItem icon={Check} label="Save" />
          <ToolbarItem icon={ArrowUp} label="Top" />
          <ToolbarItem icon={ArrowDown} label="Bottom" />
          <ToolbarItem icon={RotateCcw} label="Reset" active />
          <ToolbarItem icon={HelpCircle} label="Help" />
        </div>

        <div className="flex items-center gap-6 text-xs">
          <Radio label="Sort products" checked />
          <Radio label="Sort groups" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left tree */}
        <aside className="w-72 bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 p-3 text-sm">
          <TreeItem label="Products" active />
          <TreeItem label="group one" nested />
        </aside>

        {/* Right panel */}
        <main className="flex-1 bg-stone-50 dark:bg-stone-900 p-4">
          <div className="flex items-center justify-between border border-stone-200 dark:border-stone-700 rounded bg-white dark:bg-stone-800 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Tag size={14} />
              <span>makerers</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-amber-500 text-xs flex items-center justify-center">
              0
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ToolbarItem({ icon: Icon, label, active }: any) {
  return (
    <div
      className={`flex flex-col items-center cursor-pointer ${
        active
          ? "text-stone-900 dark:text-white"
          : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white"
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
}

function Radio({ label, checked }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300">
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
          checked ? "border-amber-500" : "border-stone-500"
        }`}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-amber-500" />}
      </span>
      {label}
    </label>
  );
}

function TreeItem({ label, nested, active }: any) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
        active
          ? "bg-amber-600 text-stone-900 dark:text-white"
          : "hover:bg-stone-100 dark:bg-stone-700"
      } ${nested ? "ml-4 text-stone-700 dark:text-stone-300" : ""}`}
    >
      {nested ? <span>+</span> : <span>-</span>}
      <span>{label}</span>
    </div>
  );
}
