// components/payment-type-drawer.tsx
"use client";

import * as React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { PaymentType } from "@/db/schema/paymentTypes";
import { Switch } from "@/components/ui/switch";
interface PaymentTypeDrawerProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  initialData?: Partial<PaymentType>;
  onSave: (data: Omit<PaymentType, "id" | "createdAt" | "updatedAt">) => void;
}

export default function PaymentTypeDrawer({
  open,
  setOpen,
  initialData,
  onSave,
}: PaymentTypeDrawerProps) {
  const [form, setForm] = React.useState({
    name: initialData?.name || "",
    position: initialData?.position || 0,
    code: initialData?.code || "",
    enabled: initialData?.enabled || false,
    quickPayment: initialData?.quickPayment || false,
    customerRequired: initialData?.customerRequired || false,
    changeAllowed: initialData?.changeAllowed || false,
    markTransactionAsPaid: initialData?.markTransactionAsPaid || false,
    printReceipt: initialData?.printReceipt || false,
  });

  React.useEffect(() => {
    if (initialData) setForm({ ...form, ...initialData });
  }, [initialData]);

  const handleSave = () => {
    onSave(form);
    setOpen(false);
  };

  const toggleField = (key: keyof typeof form) =>
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
const booleanFields: {
  key: keyof typeof form;
  label: string;
}[] = [
  { key: "enabled", label: "Enabled" },
  { key: "quickPayment", label: "Quick Payment" },
  { key: "customerRequired", label: "Customer Required" },
  { key: "changeAllowed", label: "Change Allowed" },
  { key: "markTransactionAsPaid", label: "Mark Transaction As Paid" },
  { key: "printReceipt", label: "Print Receipt" },
];
  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="w-full data-[vaul-drawer-direction=right]:sm:max-w-2xl bg-slate-900 text-slate-100 border-l border-slate-700">
        <DrawerHeader className="flex flex-row items-center justify-between border-slate-700">
          {" "}
          <DrawerTitle className="text-xl font-semibold text-slate-100 flex ">
            {" "}
            {initialData ? "Edit Payment Type" : "New Payment Type"}
          </DrawerTitle>{" "}
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
            →{" "}
          </Button>{" "}
        </DrawerHeader>

        <div className="space-y-4 p-4">
          <span className="text-sm text-slate-100">Name</span>
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <span className="text-sm text-slate-100">Position</span>
          <Input
            placeholder="Position"
            type="number"
            value={form.position}
            onChange={(e) =>
              setForm({ ...form, position: Number(e.target.value) })
            }
          />

          <span className="text-sm text-slate-100">Code</span>
          <Input
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <div className="flex flex-col gap-3">
            {booleanFields.map((field) => (
              <div key={field.key} className="flex items-center gap-x-3">
                <span className="text-sm text-slate-100">{field.label}</span>
                <Switch
                  checked={form[field.key] as boolean}
                  onCheckedChange={() => toggleField(field.key)}
                />
              </div>
            ))}
          </div>

          <Button className="w-full mt-4" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
