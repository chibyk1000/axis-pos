"use client";

import { useState } from "react";
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

export default function DocumentProductDrawer({ open, setOpen }:{open:boolean, setOpen: (val:boolean)=>void}) {
  const [quantity, setQuantity] = useState(0);
  const [priceBeforeTax, setPriceBeforeTax] = useState(0);
  const [discount, setDiscount] = useState(0);

  const totalBeforeTax = quantity * priceBeforeTax;
  const total = totalBeforeTax - (discount / 100) * totalBeforeTax;

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="ml-auto h-full w-95 rounded-none border-l border-slate-700 bg-slate-900 text-slate-200">
        {/* Header */}
        <DrawerHeader className="border-b border-slate-700">
          <DrawerTitle className="text-lg font-medium text-slate-100">
            prid11
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

          {/* Price */}
          <div className="space-y-1">
            <Label className="text-slate-400">Price</Label>
            <Input
              disabled
              value={totalBeforeTax.toFixed(2)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-slate-400">Discount (after tax)</Label>

            <div className="flex gap-2">
              <Select defaultValue="percent">
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

              <div className="flex items-center text-slate-400">%</div>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-4">
            {/* Total before tax */}
            <div className="space-y-1">
              <Label className="text-slate-400">Total before tax</Label>
              <Input
                disabled
                value={totalBeforeTax.toFixed(2)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Total */}
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

        {/* Footer */}
        <DrawerFooter className="flex-row gap-3 border-t border-slate-700 p-4">
          <Button className="flex-1 bg-slate-700 hover:bg-slate-600">OK</Button>

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
