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

const taxRates = [
  {
    name: "56",
    rate: "0%",
    code: "",
    fixed: false,
    enabled: true,
  },
];

export default function TaxRatesTable() {
  const [selected, setSelected] = useState<number | null>(0);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 p-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <ToolbarButton icon={<RefreshCcw />} label="Refresh" />
        <ToolbarButton icon={<Plus />} label="New tax rate" />
        <ToolbarButton
          icon={<Pencil />}
          label="Edit"
          disabled={selected === null}
        />
        <ToolbarButton
          icon={<Trash2 />}
          label="Delete"
          disabled={selected === null}
        />
        <ToolbarButton icon={<ArrowLeftRight />} label="Switch taxes" />
        <ToolbarButton icon={<HelpCircle />} label="Help" />
      </div>

      {/* Table */}
      <div className="border border-slate-700 bg-slate-800 rounded-md overflow-hidden">
        <ScrollArea className="h-[calc(100vh-120px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-800 border-b border-slate-700">
              <TableRow>
                <TableHead className="text-slate-200 w-[40%]">Name</TableHead>
                <TableHead className="text-slate-200">Rate</TableHead>
                <TableHead className="text-slate-200">Code</TableHead>
                <TableHead className="text-slate-200">Fixed</TableHead>
                <TableHead className="text-slate-200">Enabled</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {taxRates.map((tax, index) => (
                <TableRow
                  key={tax.name}
                  onClick={() => setSelected(index)}
                  className={`
                    cursor-pointer transition-colors
                    ${
                      selected === index
                        ? "bg-slate-700"
                        : "hover:bg-slate-700/50"
                    }
                  `}
                >
                  <TableCell>{tax.name}</TableCell>
                  <TableCell>{tax.rate}</TableCell>
                  <TableCell className="text-slate-400">
                    {tax.code || "—"}
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={tax.fixed} disabled />
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={tax.enabled} disabled />
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
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
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
