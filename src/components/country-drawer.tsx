"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "./ui/drawer";

interface CountryForm {
  name: string;
  code: string;
}

export default function CountryDrawer({
  open,
  onOpenChange,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { name: string; code: string } | null;
  onSave: (data: CountryForm) => Promise<void>;
}) {
  const [form, setForm] = useState<CountryForm>({
    name: "",
    code: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({ name: "", code: "" });
    }
  }, [initialData, open]);

  const canSave = form.name.trim() && form.code.trim();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent  className="bg-slate-900 text-slate-100 px-2">
        <DrawerHeader>
          <DrawerTitle>
            {initialData ? "Edit country" : "New country"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 mt-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Country name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nigeria"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Country code</label>
            <Input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="NG"
              maxLength={2}
            />
          </div>
        </div>

        <DrawerFooter className="mt-8">
          <Button
            disabled={!canSave}
            onClick={async () => {
              await onSave(form);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
