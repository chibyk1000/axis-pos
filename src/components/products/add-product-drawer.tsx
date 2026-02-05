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
import ReactSelect from "react-select";
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
import { NewProduct, Product } from "@/db/schema/products";
import { Tax, useTaxes } from "@/hooks/controllers/taxes";
import { useCustomers } from "@/hooks/controllers/customers";
import { useRootWithoutChildren } from "@/hooks/controllers/nodes";
import { uploadImage } from "@/helpers/image";
import type { UploadedImage } from "@/helpers/image";
interface AddProductDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialData?: Product;
  onSave: (
    data: NewProduct,
    groupId: string | null,
    supplier: string | null,
    comments: {
      id: string;
      text: string;
    }[],
    selectedTaxes: {
      id: string;
      fixed: boolean;
      name: string;
      code: string;
      rate: number;
      enabled: boolean;
      createdAt: Date;
      updatedAt: Date | null;
    }[],
    barcodes: {
      id: string;
      text: string;
    }[],
  ) => void;
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

  onSave,
  nodeId,
  initialData,
}: AddProductDrawerProps) => {
  const [activeTab, setActiveTab] = React.useState("Details");
  const { data = [] } = useRootWithoutChildren();

  // Form states
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [groupId, setGroupId] = React.useState<string | null>("root");
  const [active, setActive] = React.useState(false);
  const [defaultQuantity, setDefaultQuantity] = React.useState(false);
  const [service, setService] = React.useState(false);
  const [ageRestriction, setAgeRestriction] = React.useState<
    number | undefined
  >();
  const [description, setDescription] = React.useState("");
  const [cost, setCost] = React.useState<number | undefined>();
  const [markup, setMarkup] = React.useState<number | undefined>();
  const [salePrice, setSalePrice] = React.useState<number | undefined>();
  const [priceIncludesTax, setPriceIncludesTax] = React.useState(false);
  const [priceChangeAllowed, setPriceChangeAllowed] = React.useState(false);
  const [supplier, setSupplier] = React.useState<string | null>(null);
  const [reorderPoint, setReorderPoint] = React.useState<number | undefined>();
  const [preferredQuantity, setPreferredQuantity] = React.useState<
    number | undefined
  >();
  const [lowStockWarning, setLowStockWarning] = React.useState(false);
  const [lowStockQuantity, setLowStockQuantity] = React.useState<
    number | undefined
  >();
  const [barcodes, setBarcodes] = React.useState<
    { id: string; text: string }[]
  >([]);
  const [comments, setComments] = React.useState<
    { id: string; text: string }[]
  >([]);
  const [color, setColor] = React.useState<string | null>(null);

  const [isAddingTax, setIsAddingTax] = React.useState(false);
  const { data: taxes = [] } = useTaxes(); // from TanStack
  const [selectedTaxes, setSelectedTaxes] = React.useState<Tax[]>([]);
  const [selectedTaxId, setSelectedTaxId] = React.useState<string | null>(null);
  const { data: users = [] } = useCustomers();
   const [image, setImage] = React.useState<UploadedImage | null>(null);
  const taxOptions = taxes.map((tax) => ({
    value: tax.id,
    label: `${tax.name} (${tax.rate}%)`,
    tax,
  }));

  const handleSave = () => {
    onSave(
      {
        title: name,
        id: crypto.randomUUID(),
        code,
        unit,
        active,
        defaultQuantity,
        service,
        ageRestriction,
        description,
        cost,
        markup,
        salePrice,
        priceChangeAllowed,
        reorderPoint,
        preferredQuantity,
        lowStockWarning,
        color,
        nodeId,
        lowStockWarningQuantity: lowStockWarning ? 1 : 0,
        priceAfterTax: priceIncludesTax,
        image: image?.path,
        
        
      },
      groupId,
      supplier,
      comments,
      selectedTaxes,
      barcodes,

    );
    onOpenChange(false);
  };
  const removeTax = (id: string) => {
    setSelectedTaxes((prev) => prev.filter((t) => t.id !== id));
  };

  const addTax = () => {
    if (!selectedTaxId) return;

    const tax = taxes.find((t) => t.id === selectedTaxId);

    if (!tax) return;

    // prevent duplicates
    // if (selectedTaxes.some((t) => t.id === tax.id)) return;

    setSelectedTaxes((prev) => [...prev, { ...tax }]);

    setSelectedTaxId(null);
    setIsAddingTax(false);
  };

  const handleAddBarcode = () => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    // check if barcode already exists
    if (barcodes.some((b) => b.text === trimmed)) return;

    setBarcodes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed },
    ]);
    setBarcode(""); // clear input after adding
  };

  const handleGenerateBarcode = () => {
    const generated = Math.floor(Math.random() * 1e12)
      .toString()
      .padStart(12, "0");

    if (barcodes.some((b) => b.text === generated)) return;

    setBarcodes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: generated },
    ]);
  };

  const handleRemoveBarcode = (code: string) => {
    setBarcodes((prev) => prev.filter((b) => b.text !== code));
  };

  React.useEffect(() => {
    if (open && initialData) {
      setName(initialData.title);
      setCode(initialData.code);
      setUnit(initialData.unit);
      setGroupId(initialData.nodeId ?? "root");
      setActive(initialData.active);
      setDefaultQuantity(initialData.defaultQuantity);
      setService(initialData.service);
      setAgeRestriction(initialData.ageRestriction as number);
      setDescription(initialData?.description as string);
      setCost(initialData.cost);
      setMarkup(initialData.markup);
      setSalePrice(initialData.salePrice);
      setPriceIncludesTax(initialData.priceAfterTax ?? false);
      setPriceChangeAllowed(initialData.priceChangeAllowed ?? false);
      setSupplier(initialData.supplier?.id ?? null);
      setReorderPoint(initialData.reorderPoint as number);
      setPreferredQuantity(initialData?.preferredQuantity as number);
      setLowStockWarning(initialData.lowStockWarning ?? false);
      setLowStockQuantity(initialData.lowStockWarningQuantity as number);
      const barcodes = initialData.barcodes
        ? initialData.barcodes.map((barcode) => {
            return { id: barcode.id, text: barcode.value };
          })
        : [];
      setBarcodes(barcodes ?? []);
      const comments = initialData.comments
        ? initialData.comments.map((comment) => {
            return { id: comment.id, text: comment.content };
          })
        : [];
      setComments(comments ?? []);
      setColor(initialData.color ?? null);
        if (initialData.image) {
      setImage({
        path: initialData.image,
        base64: "",
        previewUrl: initialData.image,
        name: "existing-image",
      });
    }
      
    
   const taxes = initialData.taxes
     ? initialData.taxes.map((tax) => {
         return tax.tax
       })
     : [];
      console.log(taxes);
      
      setSelectedTaxes(taxes ?? []);
      setSelectedTaxId(null);
    }
  }, [open, initialData]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full data-[vaul-drawer-direction=right]:sm:max-w-2xl bg-slate-900 text-slate-100 border-l border-slate-700">
        {/* Header */}
        <DrawerHeader className="flex flex-row items-center justify-between border-slate-700">
          {" "}
          <DrawerTitle className="text-xl font-semibold text-slate-100 flex ">
            {" "}
            New product{" "}
          </DrawerTitle>{" "}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {" "}
            →{" "}
          </Button>{" "}
        </DrawerHeader>

        {/* Tabs */}
        <div className="flex gap-2 px-6 border-b border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm transition-colors ${
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
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-6 space-y-5 text-sm">
          {activeTab === "Details" && (
            <>
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>

              <Field label="Code" className="w-40">
                <Input value={code} onChange={(e) => setCode(e.target.value)} />
              </Field>

              <Field label="Barcode">
                <div className="flex gap-2">
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Enter barcode"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddBarcode();
                    }}
                  />
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-200 text-xs mt-1"
                    onClick={handleGenerateBarcode}
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-200 text-xs mt-1"
                    onClick={handleAddBarcode}
                  >
                    Add
                  </button>
                </div>

                {/* Display added barcodes */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {barcodes.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-sm"
                    >
                      <span>{b.text}</span>
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => handleRemoveBarcode(b.text)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label="Unit of measurement">
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </Field>

              <Field label="Group">
                <Select
                  onValueChange={(val) => setGroupId(val)}
                  value={groupId as string}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {data.map((g) => (
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
                <Toggle
                  label="Active"
                  defaultChecked={active}
                  onChange={setActive}
                />
                <Toggle
                  label="Default quantity"
                  defaultChecked={defaultQuantity}
                  onChange={setDefaultQuantity}
                />
                <Toggle
                  label="Service (not using stock)"
                  onChange={setService}
                />
              </div>

              <Field label="Age restriction" className="w-48">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={ageRestriction ?? ""}
                    onChange={(e) => setAgeRestriction(Number(e.target.value))}
                  />
                  <span className="text-sm text-slate-400">year(s)</span>
                </div>
              </Field>

              <Field label="Description">
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </>
          )}

          {activeTab === "Price & tax" && (
            <>
              <div className="space-y-4">
                {/* Selected taxes list */}
                {selectedTaxes.length > 0 && (
                  <div className="space-y-2">
                    {selectedTaxes.map((tax) => (
                      <div
                        key={tax.id}
                        className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded"
                      >
                        <span className="text-sm">
                          {tax.name} ({tax.rate}%)
                        </span>

                        <button
                          onClick={() => removeTax(tax.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="">
                  <p>Taxes</p>
                  {!isAddingTax ? (
                    <Button
                      variant="ghost"
                      disabled={taxOptions.length < 1}
                      onClick={() => setIsAddingTax(true)}
                      className="flex items-center gap-2 text-sm bg-sky-500"
                    >
                      <Plus size={16} />
                      Add tax
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ReactSelect
                        options={taxOptions}
                        value={
                          taxOptions.find((o) => o.value === selectedTaxId) ??
                          null
                        }
                        onChange={(opt) => setSelectedTaxId(opt?.value ?? null)}
                        className="flex-1"
                        styles={{
                          control: (base) => ({
                            ...base,
                            backgroundColor: "#1e293b",
                            borderColor: "#334155",
                            color: "white",
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: "#1e293b",
                          }),
                          option: (base) => ({
                            ...base,
                            backgroundColor: "transparent",
                          }),
                          input: (base) => ({
                            ...base,
                            color: "white",
                          }),
                          singleValue: (base) => ({
                            ...base,
                            color: "white",
                          }),
                        }}
                      />

                      <button
                        onClick={addTax}
                        disabled={!selectedTaxId}
                        className="p-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>

                      <button
                        onClick={() => {
                          setIsAddingTax(false);
                          setSelectedTaxId(null);
                        }}
                        className="p-2 text-slate-400 hover:text-white"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Field label="Cost" className="mt-5">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={cost ?? ""}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
              </Field>

              <Field label="Markup">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={markup ?? ""}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                />
                %
              </Field>

              <Field label="Sale price">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={salePrice ?? ""}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                />
              </Field>

              <div className="flex items-center gap-2">
                <Switch
                  checked={priceIncludesTax}
                  onCheckedChange={(checked) => setPriceIncludesTax(checked)}
                />{" "}
                price includes tax
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch
                  checked={priceChangeAllowed}
                  onCheckedChange={(checked) => setPriceChangeAllowed(checked)}
                />{" "}
                price change allowed
              </div>
            </>
          )}

          {/* Stock control */}
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
                <Select onValueChange={(val) => setSupplier(val)}>
                  <SelectTrigger className="w-lg">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent
                    data-side="bottom"
                    className="bg-slate-800 border-slate-700 top-10"
                    position="item-aligned"
                  >
                    {users.map((sup) => {
                      return (
                        <SelectItem
                          value="(none)"
                          className="focus:bg-slate-700"
                        >
                          {sup.name}
                        </SelectItem>
                      );
                    })}
                    {users.length < 1 && (
                      <SelectItem value="(none)" className="focus:bg-slate-700">
                        (none)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Reorder point">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={reorderPoint ?? ""}
                  onChange={(e) => setReorderPoint(Number(e.target.value))}
                />
              </Field>

              <Field label="Preferred quantity">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={preferredQuantity ?? ""}
                  onChange={(e) => setPreferredQuantity(Number(e.target.value))}
                />
              </Field>

              <Field label="">
                <Switch
                  checked={lowStockWarning}
                  onCheckedChange={(checked) => setLowStockWarning(checked)}
                />{" "}
                Low stock warning
              </Field>

              <Field label="Low stock warning quantity">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={lowStockQuantity ?? ""}
                  onChange={(e) => setLowStockQuantity(Number(e.target.value))}
                  disabled={!lowStockWarning}
                />
              </Field>

              <Button variant={"link"}>Reset to default</Button>
            </div>
          )}

          {/* Comments */}
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
                <Input
                  placeholder="Enter comment"
                  onChange={(e) => {
                    setComments((prev) => [
                      ...prev,
                      { text: e.target.value, id: crypto.randomUUID() },
                    ]);
                  }}
                />
                <Button variant="ghost" size={"sm"}>
                  <Plus />
                  Add
                </Button>
                <Button variant="ghost" size={"sm"}>
                  <Trash /> Delete
                </Button>
              </div>

              <ScrollArea className="border min-h-[20dvh]" />
            </div>
          )}

          {/* Image & Color */}
          {activeTab === "Image & color" && (
            <div className="text-sm text-slate-400">
              {/* Colors */}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">Colors</label>
                <Select onValueChange={(val) => setColor(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800">
                    {[
                      "transparent",
                      "slate",
                      "red",
                      "green",
                      "blue",
                      "yellow",
                      "indigo",
                      "purple",
                      "pink",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        <div
                          className={`w-4 h-4 rounded-sm ${c === "transparent" ? "border border-slate-400 bg-transparent" : `bg-${c}-500`}`}
                        ></div>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image */}
              {/* Image */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400">Image</label>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="bg-transparent text-white"
                    onClick={async () => {
                      const result = await uploadImage();
                      if (!result) return;
                      setImage(result);
                    }}
                  >
                    Browse
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={!image}
                    onClick={() => setImage(null)}
                  >
                    Clear
                  </Button>
                </div>

                {image && (
                  <div className="flex items-center gap-3 mt-2">
                    <img
                      src={image.previewUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded border border-slate-700"
                    />
                    <p className="text-xs text-slate-400 truncate">
                      {image.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

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
  <div
    className={className}
    style={{
      marginBottom: "1rem",
    }}
  >
    <label className="text-sm text-slate-400">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const Toggle = ({
  label,
  defaultChecked,
  onChange,
}: {
  label: string;
  defaultChecked?: boolean;
  onChange?: (val: boolean) => void;
}) => (
  <div className="flex items-center gap-2">
    <Switch
      defaultChecked={defaultChecked}
      onCheckedChange={(checked) => onChange?.(checked)}
    />
    <span>{label}</span>
  </div>
);

export default AddProductDrawer;
