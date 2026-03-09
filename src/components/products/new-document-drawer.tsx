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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Product } from "@/db/schema";
import { useCreateDocumentItem } from "@/hooks/controllers/useDocumentItems";
import { toast } from "react-toastify";


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
editingItem
}: Props) {
  const createItem = useCreateDocumentItem();

  const [quantity, setQuantity] = useState(1);
  const [priceBeforeTax, setPriceBeforeTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("percent");

useEffect(() => {
  if (editingItem) {
    setQuantity(editingItem.quantity);
    setPriceBeforeTax(editingItem.priceBeforeTax);
    setDiscount(editingItem.discount ?? 0);
  } else if (product) {
    setPriceBeforeTax(product.salePrice ?? 0);
    setQuantity(1);
    setDiscount(0);
  }
}, [product, editingItem]);

  const totalBeforeTax = quantity * priceBeforeTax;

  const total =
    discountType === "percent"
      ? totalBeforeTax - (discount / 100) * totalBeforeTax
      : totalBeforeTax - discount;

function handleAddItem() {
  if (!product) return;

  onAddItem({
    ...editingItem,
    productId: product.id,
    name: product.title,
    unit: product.unit,
    quantity,
    priceBeforeTax,
    taxRate: 0,
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

          {/* Price before tax */}
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
            <Label className="text-slate-400">Tax</Label>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Add taxes
            </Button>
          </div>
          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-slate-400">Discount</Label>

            <div className="flex gap-2">
              <Select
                defaultValue="percent"
                onValueChange={(v) => setDiscountType(v)}
              >
                <SelectTrigger className="w-42.5 bg-slate-800 border-slate-700 text-white">
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
            disabled={!product || createItem.isPending}
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
