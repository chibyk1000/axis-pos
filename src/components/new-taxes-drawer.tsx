"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, } from "lucide-react";
import Counter from "./counter";

interface TaxRateDrawerProps {
  open: boolean;
  initialData?: {
    id: string;
    name: string;
    code: string;
    rate: number;
    fixed: boolean;
    enabled: boolean;
  };
  setOpen: (open: boolean) => void;
  onSave?: (taxRate: {
    id?: string;
    name: string;
    code: string;
    rate: number;
    fixed: boolean;
    enabled: boolean;
  }) => void;
}

export default function TaxRateDrawer({
  open,
  setOpen,
  onSave,
  initialData,
}: TaxRateDrawerProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [rate, setRate] = React.useState(0);
  const [fixed, setFixed] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);

  // Prefill form when editing
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setRate(initialData.rate);
      setFixed(initialData.fixed);
      setEnabled(initialData.enabled);
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const handleCancel = () => {
    setOpen(false);
    resetForm();
  };

  const handleSave = () => {
    if (!name || !code) {
      alert("Name and code are required");
      return;
    }

    if (onSave) {
      onSave({
        id: initialData?.id, // pass id if updating
        name,
        code,
        rate,
        fixed,
        enabled,
      });
    }

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setCode("");
    setRate(0);
    setFixed(false);
    setEnabled(true);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="bg-slate-900 text-slate-100 border-slate-800">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle className="text-lg font-semibold">
            {initialData ? "Edit Tax Rate" : "New Tax Rate"}
          </DrawerTitle>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </DrawerHeader>

        <div className="px-4 py-2 space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-slate-700 focus-visible:ring-slate-600"
            />
          </div>

          {/* Code */}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-32 block bg-slate-800 border-slate-700 focus-visible:ring-slate-600"
            />
          </div>

          {/* Rate */}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Rate</label>
            <div className="flex items-center gap-2">
              <Counter initialValue={rate} onChange={(value) => {
                setRate(value)
              }} /> %
         
            </div>
          </div>

          {/* Fixed */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Fixed</span>
            <Switch checked={fixed} onCheckedChange={setFixed} />
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Enabled</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DrawerFooter className="flex-row gap-2 border-t border-slate-800">
          <Button
            variant="outline"
            className="flex-1 bg-slate-800 border-slate-700"
            onClick={handleCancel}
          >
            Cancel
          </Button>

          <Button
            className="flex-1 bg-slate-700 hover:bg-slate-600"
            onClick={handleSave}
          >
            {initialData ? "Update" : "Save"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
