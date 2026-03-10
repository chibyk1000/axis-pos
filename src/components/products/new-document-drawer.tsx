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

import { Product } from "@/db/schema";
import { useTaxes } from "@/hooks/controllers/taxes";
import { Plus, Minus } from "lucide-react";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  product: Product | undefined;
  editingItem?: any | null;
  onAddItem: (item: any) => void;
};

export default function DocumentProductDrawer({
  open,
  setOpen,
  product,
  onAddItem,
  editingItem,
}: Props) {
  const { data: taxes = [] } = useTaxes();

  const [quantity, setQuantity] = useState(1);
  const [priceBeforeTax, setPriceBeforeTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("percent");
  
  const [selectedTax, setSelectedTax] = useState<any | null>(null);
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

    setSelectedTax(tax);
    setSelectedTaxId(null);
    setIsAddingTax(false);
  };

  const removeTax = () => {
    setSelectedTax(null);
  };

  useEffect(() => {
    if (editingItem) {
      setQuantity(editingItem.quantity);
      setPriceBeforeTax(editingItem.priceBeforeTax);
      setDiscount(editingItem.discount ?? 0);
      setSelectedTax(editingItem.tax ?? null);
    } else if (product) {
      setPriceBeforeTax(product.salePrice ?? 0);
      setQuantity(1);
      setDiscount(0);
      setSelectedTax(null);
    }
  }, [product, editingItem]);

  const totalBeforeTax = quantity * priceBeforeTax;

  const totalAfterDiscount =
    discountType === "percent"
      ? totalBeforeTax - (discount / 100) * totalBeforeTax
      : totalBeforeTax - discount;

  const taxTotal = selectedTax
    ? (selectedTax.rate / 100) * totalAfterDiscount
    : 0;

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
      tax: selectedTax,
      discount,
      total,
    });

    setOpen(false);
  }

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
              onChange={(e) => setPriceBeforeTax(Number(e.target.value))}
            />
          </div>

          {/* Tax */}
          <div className="space-y-2">
            <p>Tax</p>

            {selectedTax && (
              <div className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded">
                <span>
                  {selectedTax.name} ({selectedTax.rate}%)
                </span>

                <button onClick={removeTax} className="text-red-400">
                  <Minus size={16} />
                </button>
              </div>
            )}

            {!selectedTax && !isAddingTax && (
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
