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

export default function SortingScreen() {
    const navigate   = useNavigate()
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
              <div className="flex items-center gap-2 text-sm">
                  <button onClick={()=>navigate(-1)}>
                      
          <ArrowLeft size={16} />
                  </button>
          <span className="font-semibold">Sorting</span>
        </div>
        <X
          size={18}
          className="cursor-pointer text-slate-400 hover:text-white"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-850">
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
        <aside className="w-72 bg-slate-800 border-r border-slate-700 p-3 text-sm">
          <TreeItem label="Products" active />
          <TreeItem label="group one" nested />
        </aside>

        {/* Right panel */}
        <main className="flex-1 bg-slate-900 p-4">
          <div className="flex items-center justify-between border border-slate-700 rounded bg-slate-800 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Tag size={14} />
              <span>makerers</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-sky-500 text-xs flex items-center justify-center">
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
        active ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
}

function Radio({ label, checked }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
          checked ? "border-sky-500" : "border-slate-500"
        }`}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-sky-500" />}
      </span>
      {label}
    </label>
  );
}

function TreeItem({ label, nested, active }: any) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
        active ? "bg-sky-600 text-white" : "hover:bg-slate-700"
      } ${nested ? "ml-4 text-slate-300" : ""}`}
    >
      {nested ? <span>+</span> : <span>-</span>}
      <span>{label}</span>
    </div>
  );
}
