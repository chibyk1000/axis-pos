"use client";

import {
  ArrowLeft,
  Printer,
  Save,
  ZoomIn,
  ZoomOut,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router";

export default function PriceTagsPage() {
    const navigate = useNavigate()
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-slalte-800">
        <Button size="icon" variant="ghost" onClick={()=> navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-sm font-medium">Price tags</h1>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <aside className="w-80 shrink-0 border-r border-slate-800 p-4 overflow-y-auto space-y-6">
          {/* Label size */}
          <Section title="Label size">
            <TwoInputs a="Label width" b="Label height" />
            <TwoInputs a="Row spacing" b="Column spacing" />
          </Section>

          {/* Display */}
          <Section title="Display">
            <Toggle label="Product name" />
            <Toggle label="Code (SKU)" />
            <Toggle label="Tax inclusive price" />
            <Toggle label="Price" />
            <Toggle label="Barcode" />
            <Toggle label="Borders" />
          </Section>

          {/* Barcode */}
          <Section title="Barcode">
            <Select defaultValue="ean13">
              <SelectTrigger className="bg-slate-800">
                <SelectValue placeholder="Barcode type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ean13">EAN13</SelectItem>
                <SelectItem value="code128">CODE128</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          {/* Sliders */}
          <Section title="Sizes">
            <SliderRow label="Product name size" />
            <SliderRow label="Price size" />
            <SliderRow label="Barcode height" />
          </Section>

          {/* Products */}
          <Section title="Products">
            <div className="flex gap-2">
              <Button size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
              <Input placeholder="Product name" className="bg-slate-800" />
            </div>

            <div className="mt-4 text-xs text-slate-400 text-center">
              No products selected
              <br />
              All products will be printed
            </div>
          </Section>

          {/* Copies */}
          <Section title="Number of copies">
            <div className="flex items-center gap-2">
              <Button variant="secondary">−</Button>
              <Input value="1" className="w-16 text-center bg-slate-800" />
              <Button variant="secondary">+</Button>
            </div>
          </Section>

          <Button className="w-full mt-4">Print preview</Button>
        </aside>

        {/* RIGHT PREVIEW */}
        <main className="flex-1 bg-slate-950 flex flex-col">
          {/* Toolbar */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-slate-800">
            <div className="flex gap-2">
              <Button size="icon" variant="ghost">
                <Printer className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost">
                <Save className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Button size="icon" variant="ghost">
                <ZoomOut />
              </Button>
              100%
              <Button size="icon" variant="ghost">
                <ZoomIn />
              </Button>
            </div>
          </div>

          {/* Preview canvas */}
          <div className="flex-1 overflow-auto p-6">
            <div className="mx-auto bg-white aspect-[1/1.4] max-w-xl border border-yellow-500 relative">
              {/* Product name */}
              <div className="text-center text-sm mt-4">makerers</div>

              {/* Price */}
              <div className="text-center text-xl font-semibold">£418.95</div>

              {/* SKU */}
              <div className="absolute left-1 top-1/2 -rotate-90 text-xs">
                SKU: 1
              </div>

              {/* Barcode */}
              <div className="absolute bottom-6 w-full flex justify-center">
                <div className="h-12 w-48 bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,#fff_2px,#fff_4px)]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Section({ title, children }: any) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function TwoInputs({ a, b }: { a: string; b: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder={a} className="bg-slate-800" />
      <Input placeholder={b} className="bg-slate-800" />
    </div>
  );
}

function Toggle({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked />
    </div>
  );
}

function SliderRow({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      <Slider defaultValue={[50]} />
    </div>
  );
}
