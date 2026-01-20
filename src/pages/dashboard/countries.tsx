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
import { Plus, RefreshCcw, Pencil, Trash2 } from "lucide-react";

const countries = [
  { name: "Afghanistan", code: "AF" },
  { name: "Albania", code: "AL" },
  { name: "Algeria", code: "DZ" },
  { name: "American Samoa", code: "AS" },
  { name: "Andorra", code: "AD" },
  { name: "Angola", code: "AO" },
  { name: "Anguilla", code: "AI" },
  { name: "Antarctica", code: "AQ" },
  { name: "Antigua And Barbuda", code: "AG" },
  { name: "Argentina", code: "AR" },
  { name: "Armenia", code: "AM" },
  { name: "Aruba", code: "AW" },
  { name: "Australia", code: "AU" },
  { name: "Austria", code: "AT" },
  { name: "Azerbaijan", code: "AZ" },
  { name: "Bahamas", code: "BS" },
  { name: "Bahrain", code: "BH" },
  { name: "Bangladesh", code: "BD" },
];

export default function CountriesTable() {
  const [selected, setSelected] = useState<number | null>(0);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 p-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          New country
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={selected === null}
          className="text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={selected === null}
          className="text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Table container */}
      <div className="border border-slate-700 rounded-md bg-slate-800 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-110px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-800 border-b border-slate-700">
              <TableRow>
                <TableHead className="w-[70%] text-slate-200">Name</TableHead>
                <TableHead className="text-slate-200">Code</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {countries.map((country, index) => (
                <TableRow
                  key={country.code}
                  onClick={() => setSelected(index)}
                  className={`
                    cursor-pointer transition-colors
                    ${
                      selected === index
                        ? "bg-slate-700 text-white"
                        : "hover:bg-slate-700/50"
                    }
                  `}
                >
                  <TableCell className="text-slate-100">
                    {country.name}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {country.code}
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
