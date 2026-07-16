import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { RootState } from "@/store";
import {
  setTaxRatesSelected,
  setTaxRatesOpen,
  setTaxRatesSwitchOpen,
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
  useTaxesCount,
  useTaxesPage,
  useCreateTax,
  useUpdateTax,
  useDeleteTax,
  useSwitchTax,
} from "@/hooks/controllers/taxes";
import { confirm } from "@tauri-apps/plugin-dialog";
import SwitchTaxesDrawer from "@/components/products/switch-tax-drawer";
import { getNextNumber } from "@/lib/incrementalId";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageLoading } from "@/components/page-loading";

const DEFAULT_PAGE_SIZE = 25;

export default function TaxRatesTable() {
  const dispatch = useDispatch();
  const { selected, open, switchOpen } = useSelector(
    (state: RootState) => state.dashboard.taxRates,
  );

  const setSelected = (val: string | null) =>
    dispatch(setTaxRatesSelected(val));
  const setOpen = (val: boolean) => dispatch(setTaxRatesOpen(val));
  const setSwitchOpen = (val: boolean) => dispatch(setTaxRatesSwitchOpen(val));

  const switchTax = useSwitchTax();
  const { data: allTaxes = [] } = useTaxes();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data: taxes = [], refetch, isLoading } = useTaxesPage(
    page,
    pageSize,
  );
  const { data: total = 0 } = useTaxesCount();
  const createTax = useCreateTax();
  const updateTax = useUpdateTax();
  const deleteTax = useDeleteTax();

  const selectedTax =
    taxes.find((t) => t.id === selected) ??
    allTaxes.find((t) => t.id === selected);

  return (
    // flex-1/min-h-0, not h-screen: inside the dashboard shell h-screen
    // exceeded the available space and clipped the table's bottom.
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 p-4">
      <SwitchTaxesDrawer
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        taxes={allTaxes}
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
              // Add position for new tax
              const nextNumber = getNextNumber(allTaxes);
              await createTax.mutateAsync({
                code: taxData.code,
                name: taxData.name,
                rate: taxData.rate,
                id: crypto.randomUUID(),
                enabled: taxData.enabled,
                fixed: taxData.fixed,
                position: nextNumber,
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
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-md border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        {isLoading ? (
          <PageLoading label="Loading tax rates" />
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <Table>
            <TableHeader className="sticky top-0 z-10 bg-stone-100 dark:bg-stone-700 border-b border-stone-100">
              <TableRow>
                <TableHead className="text-stone-800 dark:text-stone-200 w-[40%]">
                  Name
                </TableHead>
                <TableHead className="text-stone-800 dark:text-stone-200">
                  Rate
                </TableHead>
                <TableHead className="text-stone-800 dark:text-stone-200">
                  Code
                </TableHead>
                <TableHead className="text-stone-800 dark:text-stone-200">
                  Fixed
                </TableHead>
                <TableHead className="text-stone-800 dark:text-stone-200">
                  Enabled
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {taxes.map((tax) => (
                <TableRow
                  key={tax.id}
                  onClick={() => setSelected(tax.id)}
                  className={`
                    cursor-pointer transition-colors
                    ${selected === tax.id ? "bg-stone-100 dark:bg-stone-700" : "hover:bg-stone-100 dark:bg-stone-700/50"}
                  `}
                >
                  <TableCell>{tax.name}</TableCell>
                  <TableCell>{tax.rate}%</TableCell>
                  <TableCell className="text-stone-500 dark:text-stone-400">
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
        text-stone-700 dark:text-stone-300
        hover:text-stone-900 dark:text-white
        hover:bg-white dark:bg-stone-800
        disabled:opacity-40
      "
    >
      {icon}
      {label}
    </Button>
  );
}
