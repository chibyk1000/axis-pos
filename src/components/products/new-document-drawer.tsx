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
import { AppSelect } from "@/components/ui/app-select";

import { useTaxes } from "@/hooks/controllers/taxes";
import { Plus, Minus } from "lucide-react";
import { useProductById } from "@/hooks/controllers/products";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;

  editingItem?: any | null;
  onAddItem: (item: any) => void;
  selectedDocumentProduct: string;
};

export default function DocumentProductDrawer({
  open,
  setOpen,
  onAddItem,
  editingItem,
  selectedDocumentProduct,
}: Props) {
  const { data: taxes = [] } = useTaxes();
  const { data: product } = useProductById(selectedDocumentProduct);

  const [quantity, setQuantity] = useState(1);
  const [priceBeforeTax, setPriceBeforeTax] = useState(0);
  const [price, setPrice] = useState(0);
  const [selectedTaxes, setSelectedTaxes] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  const [selectedTaxId, setSelectedTaxId] = useState<string | null>(null);
  const [isAddingTax, setIsAddingTax] = useState(false);

  const taxOptions = taxes.map((tax) => ({
    value: tax.id,
    label: `${tax.name} (${tax.rate}%)`,
  }));

  const totalTaxRate = selectedTaxes.reduce((sum, tax) => sum + (tax.rate || 0), 0);

  useEffect(() => {
    if (editingItem) {
      const q = editingItem.quantity ?? 1;
      const pbt = editingItem.priceBeforeTax ?? 0;
      const disc = editingItem.discount ?? 0;
      const discType = editingItem.discountType ?? "percent";
      const txs = editingItem.taxes ?? [];

      setQuantity(q);
      setPriceBeforeTax(pbt);
      setDiscount(disc);
      setDiscountType(discType);
      setSelectedTaxes(txs);

      const rate = txs.reduce((sum: number, t: any) => sum + (t.rate || 0), 0);
      setPrice(Number((pbt * (1 + rate / 100)).toFixed(2)));
    } else if (product) {
      // Fresh product selection
      // @ts-ignore
      const defaultPbt = product.salePrice ?? product.price ?? 0;
      setQuantity(1);
      setPriceBeforeTax(defaultPbt);
      setPrice(defaultPbt);
      setDiscount(0);
      setDiscountType("percent");
      setSelectedTaxes([]);
      setIsAddingTax(false);
      setSelectedTaxId(null);
    }
  }, [product, editingItem, open]);

  // Derived Totals
  const totalBeforeTax = quantity * priceBeforeTax;

  const totalAfterDiscount =
    discountType === "percent"
      ? totalBeforeTax - (discount / 100) * totalBeforeTax
      : totalBeforeTax - discount;

  const taxTotal = selectedTaxes.reduce((sum, tax) => {
    return sum + ((tax.rate || 0) / 100) * Math.max(0, totalAfterDiscount);
  }, 0);

  const total = Math.max(0, totalAfterDiscount) + taxTotal;

  // Handlers for dynamic input changes
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
  };

  const handlePriceBeforeTaxChange = (value: number) => {
    setPriceBeforeTax(value);
    const taxMultiplier = 1 + totalTaxRate / 100;
    setPrice(Number((value * taxMultiplier).toFixed(2)));
  };

  const handlePriceChange = (value: number) => {
    setPrice(value);
    const taxMultiplier = 1 + totalTaxRate / 100;
    const beforeTax = taxMultiplier > 0 ? value / taxMultiplier : value;
    setPriceBeforeTax(Number(beforeTax.toFixed(4)));
  };

  const handleTotalBeforeTaxChange = (newTotalBeforeTax: number) => {
    const qty = quantity > 0 ? quantity : 1;
    const newPbt = Number((newTotalBeforeTax / qty).toFixed(4));
    setPriceBeforeTax(newPbt);
    const taxMultiplier = 1 + totalTaxRate / 100;
    setPrice(Number((newPbt * taxMultiplier).toFixed(2)));
  };

  const handleTotalChange = (newTotal: number) => {
    const taxMultiplier = 1 + totalTaxRate / 100;
    const afterDiscount = taxMultiplier > 0 ? newTotal / taxMultiplier : newTotal;

    let beforeTax = afterDiscount;
    if (discountType === "percent") {
      const factor = 1 - discount / 100;
      beforeTax = factor > 0 ? afterDiscount / factor : 0;
    } else {
      beforeTax = afterDiscount + discount;
    }

    const qty = quantity > 0 ? quantity : 1;
    const newPbt = Number((beforeTax / qty).toFixed(4));
    setPriceBeforeTax(newPbt);
    setPrice(Number((newPbt * taxMultiplier).toFixed(2)));
  };

  const addTax = () => {
    if (!selectedTaxId) return;

    const tax = taxes.find((t) => t.id === selectedTaxId);
    if (!tax) return;

    const exists = selectedTaxes.some((t) => t.id === tax.id);
    if (exists) return; // prevent duplicate

    const newTaxes = [...selectedTaxes, tax];
    setSelectedTaxes(newTaxes);
    setSelectedTaxId(null);
    setIsAddingTax(false);

    const newRate = newTaxes.reduce((sum, t) => sum + (t.rate || 0), 0);
    setPrice(Number((priceBeforeTax * (1 + newRate / 100)).toFixed(2)));
  };

  const removeTax = (taxId: string) => {
    const newTaxes = selectedTaxes.filter((t) => t.id !== taxId);
    setSelectedTaxes(newTaxes);

    const newRate = newTaxes.reduce((sum, t) => sum + (t.rate || 0), 0);
    setPrice(Number((priceBeforeTax * (1 + newRate / 100)).toFixed(2)));
  };

  function handleAddItem() {
    if (!product) return;

    onAddItem({
      ...editingItem,
      productId: product.id,
      name: product.title,
      unit: product.unit,
      quantity,
      priceBeforeTax,
      price,
      taxes: selectedTaxes,
      discount,
      discountType,
      totalBeforeTax,
      taxTotal,
      total,
    });

    setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="ml-auto h-full w-95 rounded-none border-l border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
        <DrawerHeader className="border-b border-stone-200 dark:border-stone-700">
          <DrawerTitle className="text-lg font-medium text-stone-900 dark:text-stone-100">
            {product?.title ?? "Edit Product"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="space-y-5 p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* Quantity */}
          <div className="space-y-1">
            <Label className="text-stone-500 dark:text-stone-400">Quantity</Label>
            <Input
              className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white"
              type="number"
              min="0.001"
              step="any"
              onFocus={(e) => e.target.select()}
              value={quantity}
              onChange={(e) => handleQuantityChange(Number(e.target.value))}
            />
          </div>

          {/* Price Before Tax */}
          <div className="space-y-1">
            <Label className="text-stone-500 dark:text-stone-400">
              Price before tax
            </Label>
            <Input
              className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white"
              type="number"
              step="any"
              onFocus={(e) => e.target.select()}
              value={priceBeforeTax}
              onChange={(e) =>
                handlePriceBeforeTaxChange(Number(e.target.value))
              }
            />
          </div>

          {/* Unit Price (after tax) */}
          <div className="space-y-1">
            <Label className="text-stone-500 dark:text-stone-400">
              Price (after tax)
            </Label>
            <Input
              className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white"
              type="number"
              step="any"
              value={price}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handlePriceChange(Number(e.target.value))}
            />
          </div>

          {/* Tax Selection */}
          <div className="space-y-2">
            <Label className="text-stone-500 dark:text-stone-400">Taxes</Label>

            {selectedTaxes.map((tax) => (
              <div
                key={tax.id}
                className="flex items-center justify-between bg-white dark:bg-stone-800 px-3 py-2 rounded border border-stone-200 dark:border-stone-700 text-sm"
              >
                <span>
                  {tax.name} ({tax.rate}%)
                </span>

                <button
                  type="button"
                  onClick={() => removeTax(tax.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Remove tax"
                >
                  <Minus size={16} />
                </button>
              </div>
            ))}

            {!isAddingTax && (
              <Button
                type="button"
                variant="ghost"
                disabled={taxOptions.length < 1}
                onClick={() => setIsAddingTax(true)}
                className="flex items-center gap-2 text-sm bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                <Plus size={16} />
                Add tax
              </Button>
            )}

            {isAddingTax && (
              <div className="flex items-center gap-2">
                <AppSelect
                  options={taxOptions}
                  value={selectedTaxId}
                  onChange={(val) => setSelectedTaxId(val)}
                  placeholder="Select tax..."
                  className="flex-1"
                />

                <button
                  type="button"
                  onClick={addTax}
                  disabled={!selectedTaxId}
                  className="p-2 bg-amber-500 text-black font-semibold rounded disabled:opacity-40"
                  title="Confirm add tax"
                >
                  <Plus size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTax(false);
                    setSelectedTaxId(null);
                  }}
                  className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-200"
                  title="Cancel"
                >
                  <Minus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-stone-500 dark:text-stone-400">Discount</Label>

            <div className="flex gap-2">
              <div className="w-40">
                <AppSelect
                  value={discountType}
                  onChange={(v: "percent" | "fixed") => setDiscountType(v)}
                  options={[
                    { value: "percent", label: "Discount %" },
                    { value: "fixed", label: "Fixed amount" },
                  ]}
                  isSearchable={false}
                />
              </div>

              <div className="relative flex-1 flex items-center">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={discount}
                  onFocus={(e) => e.target.select()}
                  className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white pr-7"
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                {discountType === "percent" && (
                  <span className="absolute right-2.5 text-stone-500 dark:text-stone-400 text-xs pointer-events-none">
                    %
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-4">
            {/* Total Before Tax (Editable) */}
            <div className="space-y-1">
              <Label className="text-stone-500 dark:text-stone-400">
                Total before tax
              </Label>
              <Input
                type="number"
                step="any"
                value={totalBeforeTax ? Number(totalBeforeTax.toFixed(2)) : totalBeforeTax}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleTotalBeforeTaxChange(Number(e.target.value))}
                className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white font-medium"
              />
            </div>

            {/* Total (Editable) */}
            <div className="space-y-1">
              <Label className="text-stone-500 dark:text-stone-400">
                Total (after tax)
              </Label>
              <Input
                type="number"
                step="any"
                value={total ? Number(total.toFixed(2)) : total}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleTotalChange(Number(e.target.value))}
                className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white font-bold text-amber-500"
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row gap-3 border-t border-stone-200 dark:border-stone-700 p-4">
          <Button
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            onClick={handleAddItem}
            disabled={!product}
          >
            OK
          </Button>

          <Button
            variant="outline"
            className="flex-1 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
