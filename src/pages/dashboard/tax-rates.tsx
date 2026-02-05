"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  HelpCircle,
} from "lucide-react";
import TaxRateDrawer from "@/components/new-taxes-drawer";
import {
  useTaxes,
  useCreateTax,
  useUpdateTax,
  useDeleteTax,
  useSwitchTax,
} from "@/hooks/controllers/taxes";
import { confirm } from "@tauri-apps/plugin-dialog";
import SwitchTaxesDrawer from "@/components/products/switch-tax-drawer";

export default function TaxRatesTable() {
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

const [switchOpen, setSwitchOpen] = useState(false);
const switchTax = useSwitchTax();
  const { data: taxes = [], refetch } = useTaxes();
  const createTax = useCreateTax();
  const updateTax = useUpdateTax();
  const deleteTax = useDeleteTax();

  const selectedTax = taxes.find((t) => t.id === selected);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 p-4">
      <SwitchTaxesDrawer
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        taxes={taxes}
        onSwitch={async (oldTaxId, newTaxId) => {
          await switchTax.mutateAsync({ oldTaxId, newTaxId });
        }}
      />

      <TaxRateDrawer
        open={open}
        setOpen={setOpen}
        onSave={async (taxData) => {
          try {
            if (selectedTax) {
              await updateTax.mutateAsync({
                id: selectedTax.id,
                data: taxData,
              });
            } else {
              await createTax.mutateAsync({
                code: taxData.code,
                name: taxData.name,
                rate: taxData.rate,
                id: crypto.randomUUID(),
                enabled: taxData.enabled,
                fixed: taxData.fixed,
              });
            }
            setOpen(false);
            refetch();
          } catch (err) {
            console.error(err);
          }
        }}
        initialData={selectedTax}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <ToolbarButton
          icon={<RefreshCcw />}
          label="Refresh"
          onClick={refetch}
        />
        <ToolbarButton
          icon={<Plus />}
          label="New tax rate"
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
        />
        <ToolbarButton
          icon={<Pencil />}
          label="Edit"
          disabled={!selectedTax}
          onClick={() => selectedTax && setOpen(true)}
        />
        <ToolbarButton
          icon={<Trash2 />}
          label="Delete"
          disabled={!selectedTax}
          onClick={async () => {
            if (!selectedTax) return;
            try {
              const userConfirmed = await confirm(
                "Are you sure you want to delete this?",
                { title: "Confirm Delete" },
              );
              if (!userConfirmed) {
                return;
              }
              await deleteTax.mutateAsync(selectedTax.id);
              setSelected(null);
              refetch();
            } catch (err) {
              console.error(err);
            }
          }}
        />
        <ToolbarButton
          icon={<ArrowLeftRight />}
          label="Switch taxes"
          onClick={() => setSwitchOpen(true)}
        />

        <ToolbarButton icon={<HelpCircle />} label="Help" />
      </div>

      {/* Table */}
      <div className="border border-slate-700 bg-slate-800 rounded-md overflow-hidden">
        <ScrollArea className="h-[calc(100vh-120px)]">
          <Table>
            <TableHeader className="  bg-slate-700 border-b border-slate-100">
              <TableRow>
                <TableHead className="text-slate-200 w-[40%]">Name</TableHead>
                <TableHead className="text-slate-200">Rate</TableHead>
                <TableHead className="text-slate-200">Code</TableHead>
                <TableHead className="text-slate-200">Fixed</TableHead>
                <TableHead className="text-slate-200">Enabled</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {taxes.map((tax) => (
                <TableRow
                  key={tax.id}
                  onClick={() => setSelected(tax.id)}
                  className={`
                    cursor-pointer transition-colors
                    ${selected === tax.id ? "bg-slate-700" : "hover:bg-slate-700/50"}
                  `}
                >
                  <TableCell>{tax.name}</TableCell>
                  <TableCell>{tax.rate}%</TableCell>
                  <TableCell className="text-slate-400">
                    {tax.code || "—"}
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={tax.fixed ?? false} disabled />
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={tax.enabled ?? false} disabled />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

/* Toolbar button */
function ToolbarButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="
        flex items-center gap-2
        text-slate-300
        hover:text-white
        hover:bg-slate-800
        disabled:opacity-40
      "
    >
      {icon}
      {label}
    </Button>
  );
}
