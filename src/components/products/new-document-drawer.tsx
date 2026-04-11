"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactSelect from "react-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import { useTaxes } from "@/hooks/controllers/taxes";
import { Plus, Minus } from "lucide-react";
import { useProductById } from "@/hooks/controllers/products";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;

  editingItem?: any | null;
  onAddItem: (item: any) => void;
  selectedDocumentProduct:string
};

export default function DocumentProductDrawer({
  open,
  setOpen,

  onAddItem,
  editingItem,
  selectedDocumentProduct
}: Props) {
  const { data: taxes = [] } = useTaxes();
   const { data: product } = useProductById(selectedDocumentProduct);
const [price, setPrice] = useState(0)
  const [quantity, setQuantity] = useState(1);
  const [selectedTaxes, setSelectedTaxes] = useState<any[]>([]);
  const [priceBeforeTax, setPriceBeforeTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("percent");

  
  const [selectedTaxId, setSelectedTaxId] = useState<string | null>(null);
  const [isAddingTax, setIsAddingTax] = useState(false);

  const taxOptions = taxes.map((tax) => ({
    value: tax.id,
    label: `${tax.name} (${tax.rate}%)`,
  }));
const addTax = () => {
  if (!selectedTaxId) return;

  const tax = taxes.find((t) => t.id === selectedTaxId);
  if (!tax) return;

  const exists = selectedTaxes.some((t) => t.id === tax.id);
  if (exists) return; // prevent duplicate

  setSelectedTaxes((prev) => [...prev, tax]);
  setSelectedTaxId(null);
  setIsAddingTax(false);
};

const removeTax = (taxId: string) => {
  setSelectedTaxes((prev) => prev.filter((t) => t.id !== taxId));
};

  useEffect(() => {
    if (editingItem) {
      setQuantity(editingItem.quantity);
      setPriceBeforeTax(editingItem.priceBeforeTax);
      setDiscount(editingItem.discount ?? 0);
      setSelectedTaxes(editingItem.taxes ?? []);
    } else if (product) { 
      // This part resets the form for a fresh product selection
      // @ts-ignore
      setPriceBeforeTax(product.salePrice ?? 0);
      setQuantity(1);
      setDiscount(0);
setSelectedTaxes([]);
      setIsAddingTax(false); // Clear the tax selection UI
      setSelectedTaxId(null);
    }
  }, [product, editingItem, open]); // Add 'open' here to trigger when the drawer opens

  const totalBeforeTax = quantity * priceBeforeTax;

  const totalAfterDiscount =
    discountType === "percent"
      ? totalBeforeTax - (discount / 100) * totalBeforeTax
      : totalBeforeTax - discount;

const taxTotal = selectedTaxes.reduce((sum, tax) => {
  return sum + (tax.rate / 100) * totalAfterDiscount;
}, 0);

  const total = totalAfterDiscount + taxTotal;

  function handleAddItem() {
    if (!product) return;

    onAddItem({
      ...editingItem,
      productId: product.id,
      name: product.title,
      unit: product.unit,
      quantity,
      priceBeforeTax,
      taxes: selectedTaxes,
      discount,
      total,
    });

    setOpen(false);
  }
const totalTaxRate = selectedTaxes.reduce((sum, tax) => sum + tax.rate, 0);
  const handlePriceBeforeTaxChange = (value: number) => {
    setPriceBeforeTax(value);

    const taxMultiplier = 1 + totalTaxRate / 100;
    setPrice(Number((value * taxMultiplier).toFixed(2)));
  };
  const handlePriceChange = (value: number) => {
    setPrice(value);

    const taxMultiplier = 1 + totalTaxRate / 100;
    const beforeTax = value / taxMultiplier;

    setPriceBeforeTax(Number(beforeTax.toFixed(2)));
  };
  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="ml-auto h-full w-95 rounded-none border-l border-slate-700 bg-slate-900 text-slate-200">
        <DrawerHeader className="border-b border-slate-700">
          <DrawerTitle className="text-lg font-medium text-slate-100">
            {product?.title}
          </DrawerTitle>
        </DrawerHeader>

        <div className="space-y-5 p-4">
          {/* Quantity */}
          <div className="space-y-1">
            <Label className="text-slate-400">Quantity</Label>
            <Input
              className="bg-slate-800 border-slate-700 text-white"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          {/* Price */}
          <div className="space-y-1">
            <Label className="text-slate-400">Price before tax</Label>
            <Input
              className="bg-slate-800 border-slate-700 text-white"
              type="number"
              value={priceBeforeTax}
              onChange={(e) =>
                handlePriceBeforeTaxChange(Number(e.target.value))
              }
            />
          </div>

          {/* Tax */}
          <div className="space-y-2">
            <p>Tax</p>

            {selectedTaxes.map((tax) => (
              <div
                key={tax.id}
                className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded"
              >
                <span>
                  {tax.name} ({tax.rate}%)
                </span>

                <button
                  onClick={() => removeTax(tax.id)}
                  className="text-red-400"
                >
                  <Minus size={16} />
                </button>
              </div>
            ))}

            {!isAddingTax && (
              <Button
                variant="ghost"
                disabled={taxOptions.length < 1}
                onClick={() => setIsAddingTax(true)}
                className="flex items-center gap-2 text-sm bg-sky-500"
              >
                <Plus size={16} />
                Add tax
              </Button>
            )}
            <div className="space-y-1">
              <Label className="text-slate-400">Price</Label>
              <Input
                className="bg-slate-800 border-slate-700 text-white"
                type="number"
                value={price}
                onChange={(e) => handlePriceChange(Number(e.target.value))}
              />
            </div>
            {isAddingTax && (
              <div className="flex items-center gap-2">
                <ReactSelect
                  options={taxOptions}
                  value={
                    taxOptions.find((o) => o.value === selectedTaxId) ?? null
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
                  className="p-2 bg-slate-700 rounded"
                >
                  <Plus size={16} />
                </button>

                <button
                  onClick={() => {
                    setIsAddingTax(false);
                    setSelectedTaxId(null);
                  }}
                  className="p-2 text-slate-400"
                >
                  <Minus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-slate-400">Discount</Label>

            <div className="flex gap-2">
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v)}
              >
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="percent">Discount percent</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={discount}
                className="bg-slate-800 border-slate-700 text-white"
                onChange={(e) => setDiscount(Number(e.target.value))}
              />

              {discountType === "percent" && (
                <div className="flex items-center text-slate-400">%</div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-700 pt-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-slate-400">Total before tax</Label>
              <Input
                disabled
                value={totalBeforeTax.toFixed(2)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400">Total</Label>
              <Input
                disabled
                value={total.toFixed(2)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row gap-3 border-t border-slate-700 p-4">
          <Button
            className="flex-1 bg-slate-700 hover:bg-slate-600"
            onClick={handleAddItem}
            disabled={!product}
          >
            OK
          </Button>

          <Button
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
