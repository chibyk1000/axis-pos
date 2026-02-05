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
import { Plus, RefreshCcw, Pencil, Trash2 } from "lucide-react";
import {
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
} from "@/hooks/controllers/countries";
import { confirm } from "@tauri-apps/plugin-dialog";
import CountryDrawer from "@/components/country-drawer";

export default function CountriesTable() {
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: countries = [], refetch } = useCountries();
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();

  const selectedCountry = countries.find((c) => c.id === selected);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 p-4">
      {/* Drawer */}
      <CountryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialData={selectedCountry ?? null}
        onSave={async (data) => {
          if (selectedCountry) {
            await updateCountry.mutateAsync({
              id: selectedCountry.id,
              data,
            });
          } else {
            await createCountry.mutateAsync(data);
          }
          refetch();
        }}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={()=>refetch()}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelected(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New country
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={!selectedCountry}
          onClick={() => setDrawerOpen(true)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={!selectedCountry}
          onClick={async () => {
            if (!selectedCountry) return;
            const ok = await confirm(`Delete ${selectedCountry.name}?`, {
              title: "Confirm delete",
            });
            if (!ok) return;

            await deleteCountry.mutateAsync(selectedCountry.id);
            setSelected(null);
            refetch();
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Table */}
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
              {countries.map((country) => (
                <TableRow
                  key={country.id}
                  onClick={() => setSelected(country.id)}
                  className={`
                    cursor-pointer transition-colors
                    ${
                      selected === country.id
                        ? "bg-slate-700 text-white"
                        : "hover:bg-slate-700/50"
                    }
                  `}
                >
                  <TableCell>{country.name}</TableCell>
                  <TableCell className="text-slate-400">
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
