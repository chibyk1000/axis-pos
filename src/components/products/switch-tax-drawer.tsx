"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tax } from "@/hooks/controllers/taxes";
import { useState } from "react";


interface SwitchTaxesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxes: Tax[];
  onSwitch: (oldTaxId: string, newTaxId: string) => Promise<void>;
}

export default function SwitchTaxesDrawer({
  open,
  onOpenChange,
  taxes,
  onSwitch,
}: SwitchTaxesDrawerProps) {
  const [oldTaxId, setOldTaxId] = useState<string>();
  const [newTaxId, setNewTaxId] = useState<string>();
  const [loading, setLoading] = useState(false);

  const canSubmit = oldTaxId && newTaxId && oldTaxId !== newTaxId && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);
      await onSwitch(oldTaxId!, newTaxId!);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-w-md bg-slate-900 border-l border-slate-700 p-6">
        <DrawerHeader>
          <DrawerTitle className="text-white">Switch Taxes</DrawerTitle>
          <p className="text-sm text-slate-400">
            Replace a tax across all products
          </p>
        </DrawerHeader>

        <div className="flex flex-col gap-4 mt-4">
          {/* Old Tax */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Old tax (remove)
            </label>
            <Select value={oldTaxId} onValueChange={setOldTaxId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tax to replace" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800">
                {taxes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.rate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Tax */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              New tax (apply)
            </label>
            <Select value={newTaxId} onValueChange={setNewTaxId}>
              <SelectTrigger>
                <SelectValue placeholder="Select replacement tax" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800">
                {taxes.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    disabled={t.id === oldTaxId}
                  >
                    {t.name} ({t.rate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DrawerFooter className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {loading ? "Switching..." : "Switch Taxes"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
