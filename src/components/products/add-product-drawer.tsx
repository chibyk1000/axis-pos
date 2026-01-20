"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../ui/drawer";
import { Alert, AlertDescription } from "../ui/alert";
import { Info, Minus, Plus, Trash } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface AddProductDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { id: string; name: string }[];
  onSave: (data: any) => void;
}

const TABS = [
  "Details",
  "Price & tax",
  "Stock control",
  "Comments",
  "Image & color",
];

const AddProductDrawer = ({
  open,
  onOpenChange,
  groups,
  onSave,
}: AddProductDrawerProps) => {
  const [activeTab, setActiveTab] = React.useState("Details");

  const handleSave = () => {
    onSave({});
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full data-[vaul-drawer-direction=right]:sm:max-w-2xl bg-slate-900 text-slate-100 border-l border-slate-700">
        {/* Header */}
        <DrawerHeader className="flex flex-row items-center justify-between  border-slate-700">
          <DrawerTitle className="text-xl font-semibold text-slate-100 flex ">
            New product
          </DrawerTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            →
          </Button>
        </DrawerHeader>

        {/* Tabs */}
        <div className="flex gap-2 px-6 border-b border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm  transition-colors ${
                activeTab === tab
                  ? "border-slate-100 text-slate-100 bg-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 text-sm">
          {activeTab === "Details" && (
            <>
              <Field label="Name">
                <Input />
              </Field>

              <Field label="Code" className="w-40">
                <Input defaultValue="2" />
              </Field>

              <Field label="Barcode">
                <Input />
                <button className="text-slate-400 hover:text-slate-200 text-xs mt-1">
                  Generate barcode
                </button>
              </Field>

              <Field label="Unit of measurement">
                <Input />
              </Field>

              <Field label="Group">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {groups.map((g) => (
                      <SelectItem
                        key={g.id}
                        value={g.id}
                        className="focus:bg-slate-700"
                      >
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex flex-col gap-3 text-sm text-slate-300">
                <Toggle label="Active" defaultChecked />
                <Toggle label="Default quantity" defaultChecked />
                <Toggle label="Service (not using stock)" />
              </div>

              <Field label="Age restriction" className="w-48">
                <div className="flex items-center gap-2">
                  <Input />
                  <span className="text-sm text-slate-400">year(s)</span>
                </div>
              </Field>

              <Field label="Description">
                <Textarea rows={4} />
              </Field>
            </>
          )}

          {activeTab === "Price & tax" && (
            <>
              <div className="text-sm text-slate-400">
                <p className="mb-1">Taxes:</p>
                <Button className="bg-sky-400 h-7 hover:bg-sky-400/90">
                  Add to tax
                </Button>
              </div>

              <div>
                <p>Cost</p>
                <Input className="w-34 h-8" type="number" min={0} />
              </div>

              <div>
                <p>Markup</p>
                <Input className="w-34 h-8" type="number" min={0} /> %
              </div>
              <div>
                <p>Sale price</p>
                <Input className="w-34 h-8" type="number" min={0} />
              </div>

              <div className="flex items-center gap-2">
                <Switch /> price includes tax
              </div>
              <div className="flex items-center gap-2">
                <Switch /> price change allowed
              </div>
            </>
          )}
          {activeTab === "Stock control" && (
            <div className="text-sm text-slate-400 space-y-3">
              <Alert className="flex items-center gap-3 bg-slate-800 border-slate-700 text-slate-100 rounded-none">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                  <Info className="h-4 w-4" />
                </div>

                <AlertDescription className="text-sm text-sky-300 flex items-center">
                  Set low stock quantity rules that can be used as a stock
                  reorder point
                </AlertDescription>
              </Alert>

              <Field label="Supplier">
                <Select>
                  <SelectTrigger className="w-lg">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent
                    data-side="bottom"
                    className="bg-slate-800 border-slate-700 top-10"
                    position="item-aligned"
                  >
                    <SelectItem value="(none)" className="focus:bg-slate-700">
                      (none)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Reorder point">
                <Input className="w-34 h-8" type="number" min={0} />
              </Field>
              <Field label="Preferred quantity">
                <Input className="w-34 h-8" type="number" min={0} />
              </Field>
              <Field label="">
                <Switch /> Low stock warning
              </Field>
              <Field label="Low stock warning">
                <Input className="w-34 h-8" type="number" min={0} />
              </Field>

              <Button variant={"link"}>Reset to default</Button>
            </div>
          )}
          {activeTab === "Comments" && (
            <div className="text-sm text-slate-400 space-y-3">
              <Alert className="flex items-center gap-3 bg-slate-800 border-slate-700 text-slate-100 rounded-none">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                  <Info className="h-4 w-4" />
                </div>

                <AlertDescription className="text-sm text-sky-300 flex items-center">
                  Comments will be printed on kitchen tickets
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-x-3">
                <Input placeholder="Enter comment" />
                <Button variant="ghost" size={"sm"}>
                  <Plus />
                  Add
                </Button>
                <Button variant="ghost" size={"sm"}>
                  <Trash /> Delete
                </Button>
              </div>

              <ScrollArea className="border min-h-[20dvh]"></ScrollArea>
            </div>
          )}
          {activeTab === "Image & color" && (
            <div className="text-sm text-slate-400">
              <>
                {/* Colors */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-400">Colors</label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800">
                      <SelectItem
                        value="transparent"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 border border-slate-400 rounded-sm bg-transparent"></div>
                        Transparent
                      </SelectItem>
                      <SelectItem
                        value="slate"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-slate-500"></div>
                        Slate
                      </SelectItem>
                      <SelectItem
                        value="red"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-red-500"></div>
                        Red
                      </SelectItem>
                      <SelectItem
                        value="green"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-green-500"></div>
                        Green
                      </SelectItem>
                      <SelectItem
                        value="blue"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-blue-500"></div>
                        Blue
                      </SelectItem>
                      <SelectItem
                        value="yellow"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-yellow-400"></div>
                        Yellow
                      </SelectItem>
                      <SelectItem
                        value="indigo"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-indigo-500"></div>
                        Indigo
                      </SelectItem>
                      <SelectItem
                        value="purple"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-purple-500"></div>
                        Purple
                      </SelectItem>
                      <SelectItem
                        value="pink"
                        className="flex items-center gap-2 focus:bg-sky-200"
                      >
                        <div className="w-4 h-4 rounded-sm bg-pink-500"></div>
                        Pink
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Image Upload */}
                <div className="flex flex-col gap-4 mt-4 ">
                  <label className="text-sm text-slate-400">Image</label>
                  <div className="grid grid-cols-2 gap-x-3">
                    <Button
                      onClick={() =>
                        document.getElementById("img-input")?.click()
                      }
                      variant={"outline"}
                      className="bg-transparent text-white"
                    >
                      Browse
                    </Button>
                    <Button
                      onClick={() =>
                        document.getElementById("img-input")?.click()
                      }
                      variant={"secondary"}
                      disabled
                    >
                      Clear
                    </Button>
                  </div>
                  <input type="file" id="img-input" hidden />
                </div>
              </>
            </div>
          )}
        </div>

        {/* Footer */}
        <DrawerFooter className="flex justify-end gap-3 border-t border-slate-700">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

/* ---------- Helpers (purely visual) ---------- */

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <label className="text-sm text-slate-400">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const Toggle = ({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) => (
  <div className="flex items-center gap-2">
    <Switch defaultChecked={defaultChecked} />
    <span>{label}</span>
  </div>
);

export default AddProductDrawer;
