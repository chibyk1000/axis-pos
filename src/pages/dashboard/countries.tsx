import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { RootState } from "@/store";
import {
  setCountriesSelected,
  setCountriesDrawerOpen,
} from "@/store/dashboardSlice";
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
  useCountriesCount,
  useCountriesPage,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
} from "@/hooks/controllers/countries";
import { confirm } from "@tauri-apps/plugin-dialog";
import CountryDrawer from "@/components/country-drawer";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageLoading } from "@/components/page-loading";

const DEFAULT_PAGE_SIZE = 25;

export default function CountriesTable() {
  const dispatch = useDispatch();
  const { selected, drawerOpen } = useSelector(
    (state: RootState) => state.dashboard.countries,
  );

  const setSelected = (val: string | null) =>
    dispatch(setCountriesSelected(val));
  const setDrawerOpen = (val: boolean) => dispatch(setCountriesDrawerOpen(val));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data: countries = [], refetch, isLoading } = useCountriesPage(
    page,
    pageSize,
  );
  const { data: total = 0 } = useCountriesCount();
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();

  const selectedCountry = countries.find((c) => c.id === selected);

  return (
    <div className="h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 p-4">
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
            await createCountry.mutateAsync({ ...data, position: total + 1 });
          }
          refetch();
        }}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
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
      <div className="flex h-[calc(100vh-110px)] flex-col overflow-hidden rounded-md border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <PageLoading label="Loading countries" />
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                <TableRow>
                  <TableHead className="w-[70%] text-stone-800 dark:text-stone-200">
                    Name
                  </TableHead>
                  <TableHead className="text-stone-800 dark:text-stone-200">
                    Code
                  </TableHead>
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
                        ? "bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-white"
                        : "hover:bg-stone-100 dark:bg-stone-700/50"
                    }
                  `}
                  >
                    <TableCell>{country.name}</TableCell>
                    <TableCell className="text-stone-500 dark:text-stone-400">
                      {country.code}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
