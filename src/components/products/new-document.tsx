import { format } from "date-fns";
import { CalendarIcon, Plus, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Textarea } from "@/components/ui/textarea";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Trash2, Save, Printer, FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useCustomers } from "@/hooks/controllers/customers";

import { useMemo } from "react";
import {
  useCreateDocument,
  useUpdateDocument,
} from "@/hooks/controllers/documents";
import { File, Folder, Tree, TreeViewElement } from "../ui/file-tree";
import { useRootNodes } from "@/hooks/controllers/nodes";

import { confirm } from "@tauri-apps/plugin-dialog";
import { FaRegFileAlt } from "react-icons/fa";

import DocumentProductDrawer from "./new-document-drawer";

import PaymentDrawer from "./new-payment-drawer";
import { toast } from "react-toastify";

export default function NewDocument({
  title,
  document,
  documentType,
  onClose,
}: {
  title: string;
  document?: any;
  documentType?: number;
  onClose?: () => void;
}) {
  const [docNumber, setDocNumber] = useState<string>(title);
  const [date, setDate] = useState<Date | undefined>(
    document?.date ? new Date(document.date) : new Date(),
  );

  const [dueDate, setDueDate] = useState<Date | undefined>(
    document?.dueDate ? new Date(document.dueDate) : new Date(),
  );
  const [openNewDocument, setOpenNewDocument] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [paid, setPaid] = useState(document?.paid ?? false);

  const updateDocument = useUpdateDocument();
  const { data: rootGroups = [] } = useRootNodes();
  // const { data } = useNodeTree()

  const [selectedDocumentProduct, setSelectedDocumentProduct] =
    useState<string>("");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [stockDate, setStockDate] = useState<Date>(
    document?.stockDate ? new Date(document.stockDate) : new Date(),
  );

  const [externalNumber, setExternalNumber] = useState(
    document?.externalNumber ?? "",
  );
  const [customerId, setCustomerId] = useState<string | undefined>(
    document?.customerId,
  );
  const createDocument = useCreateDocument();
  const [items, setItems] = useState<any[]>(document?.items ?? []);

  const [payments, setPayments] = useState<any[]>(document?.payments ?? []);

  const [internalNote, setInternalNote] = useState(
    document?.internalNote ?? "",
  );
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<
    number | null
  >(null);

  const [openPayment, setOpenPayment] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(
    null,
  );

  const mapGroupsToTree = (groups: any[]): TreeViewElement[] => {
    return groups
      .map((group) => {
        const children = group.children ? mapGroupsToTree(group.children) : [];
        const products = (group.products ?? [])
          .filter((p: any) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              p.title.toLowerCase().includes(q) ||
              p.code?.toLowerCase().includes(q)
            );
          })
          .map((p: any) => ({
            id: p.id,
            name: p.title,
            type: "product",
            isSelectable: true,
          }));

        if (searchQuery && children.length === 0 && products.length === 0) {
          return null;
        }

        return {
          id: group.id,
          name: group.name,
          type: "group",
          isSelectable: true,
          children: [...children, ...products],
        };
      })
      .filter(Boolean) as TreeViewElement[];
  };
  
  const getAllProducts = (groups: any[]): any[] => {
    const allProducts: any[] = [];
    
    const extractProducts = (groupList: any[]) => {
      groupList.forEach((group) => {
        // Add products from current group
        const groupProducts = (group.products ?? [])
          .filter((p: any) => {
            const q = searchQuery.toLowerCase();
            return (
              p.title.toLowerCase().includes(q) ||
              p.code?.toLowerCase().includes(q)
            );
          });
        
        allProducts.push(...groupProducts);
        
        // Recursively extract products from child groups
        if (group.children) {
          extractProducts(group.children);
        }
      });
    };
    
    extractProducts(groups);
    return allProducts;
  };
  
  const treeElements = mapGroupsToTree(rootGroups);
  const allProducts = getAllProducts(rootGroups);
  
  function RenderTree({ elements }: { elements: TreeViewElement[] }) {
    return (
      <>
        {elements.map((el) => {
          const isFolder = el.type === "group";

          return (
            <div
              key={el.id}
              className={cn(
                "px-2 rounded-md transition-colors cursor-pointer",
                selectedId === el.id ? "" : "",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(el.id);
              }}
            >
              {isFolder ? (
                <Folder
                  value={el.id}
                  element={el.name}
                  isSelect={selectedId === el.id}
                >
                  <RenderTree elements={el.children ?? []} />
                </Folder>
              ) : (
                <File
                  value={el.id}
                  isSelect={selectedId === el.id}
                  onDoubleClick={() => {
                    setSelectedDocumentProduct(el.id);
                    setOpenNewDocument(true);
                  }}
                  fileIcon={<FaRegFileAlt />}
                >
                  {el.name}
                </File>
              )}
            </div>
          );
        })}
      </>
    );
  }
  
  const [note, setNote] = useState(document?.note ?? "");

  const totals = useMemo(() => {
    let totalBeforeTax = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const line = item.quantity * item.priceBeforeTax;

      totalBeforeTax += line;

      const taxes = item.taxes ?? [];

      taxes.forEach((tax: any) => {
        taxTotal += (line * tax.rate) / 100;
      });
    });

    const total = totalBeforeTax + taxTotal;

    const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalBeforeTax,
      taxTotal,
      total,
      paymentsTotal,
    };
  }, [items, payments]);
  const { data: customers } = useCustomers();
  const isEdit = !!document;
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200 p-6">
      <DocumentProductDrawer
        key={selectedDocumentProduct}
        open={openNewDocument}
        selectedDocumentProduct={selectedDocumentProduct}
        setOpen={(val) => {
          setOpenNewDocument(val);
          if (!val) {
            setEditingItemIndex(null);
            setSelectedDocumentProduct(""); // Clear ID on close
          }
        }}
        editingItem={editingItemIndex !== null ? items[editingItemIndex] : null}
        onAddItem={(item) => {
          if (editingItemIndex !== null) {
            setItems((prev) =>
              prev.map((i, index) => (index === editingItemIndex ? item : i)),
            );
            setEditingItemIndex(null);
          } else {
            setItems((prev) => [...prev, item]);
          }
        }}
      />
      <PaymentDrawer
        open={openPayment}
        setOpen={(val) => {
          setOpenPayment(val);
          if (!val) setEditingPaymentIndex(null);
        }}
        payment={
          editingPaymentIndex !== null ? payments[editingPaymentIndex] : null
        }
        onSubmit={(payment) => {
          if (editingPaymentIndex !== null) {
            setPayments((prev) =>
              prev.map((p, index) =>
                index === editingPaymentIndex ? { ...p, ...payment } : p,
              ),
            );
            setEditingPaymentIndex(null);
          } else {
            setPayments((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                ...payment,
              },
            ]);
          }
        }}
      />
      {/* Top Section */}
      <div className="w-full bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 p-6 rounded-xl shadow-lg border border-stone-300 dark:border-stone-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT SIDE */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-stone-500 dark:text-stone-400">
                Number
              </Label>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-stone-500 dark:text-stone-400">
                External document
              </Label>
              <Input
                value={externalNumber}
                onChange={(e) => setExternalNumber(e.target.value)}
                className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-stone-500 dark:text-stone-400">
                Supplier
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100">
                  <SelectItem value="nil" disabled>
                    Select a customer
                  </SelectItem>

                  {customers?.map((cus) => {
                    return <SelectItem value={cus.id}>{cus.name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-4">
            {/* Date + Paid */}
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label className="text-stone-500 dark:text-stone-400">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100",
                        !date && "text-stone-500",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "M/d/yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700">
                    <Calendar
                      mode="single"
                      selected={date}
                      classNames={{
                        day_button: "text-amber-200",

                        today: "bg-amber-500 text-amber-100",
                        selected: "bg-amber-500",
                        day: "data-[selected-single=true]:bg-orange-500",
                      }}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2 pb-1">
                <Checkbox
                  checked={paid}
                  onCheckedChange={(val) => setPaid(!!val)}
                  className="border-stone-600 data-[state=checked]:bg-emerald-500"
                />
                <Label className="text-stone-700 dark:text-stone-300">
                  Paid
                </Label>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-stone-500 dark:text-stone-400">
                Due date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100",
                      !dueDate && "text-stone-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "M/d/yyyy") : "Pick due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    classNames={{
                      day_button: "text-amber-200",

                      today: "bg-amber-500 text-amber-100",
                      selected: "bg-amber-500",
                      day: "data-[selected-single=true]:bg-orange-500",
                    }}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Stock Date */}
            <div className="space-y-2 pt-2">
              <Label className="text-stone-500 dark:text-stone-400 text-xs">
                Stock date
              </Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-left bg-white dark:bg-stone-800 hover:bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-normal"
                  >
                    <RotateCcw className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                    <span className="text-stone-800 dark:text-stone-200 font-medium">
                      {format(stockDate, "M/d/yyyy h:mm a")}
                    </span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-3 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 space-y-3">
                  <Calendar
                    mode="single"
                    selected={stockDate}
                    classNames={{
                      day_button: "text-amber-200",

                      today: "bg-amber-500 text-amber-100",
                      selected: "bg-amber-500",
                      day: "data-[selected-single=true]:bg-orange-500",
                    }}
                    onSelect={(date) => {
                      if (date) {
                        // preserve time when changing date
                        const updated = new Date(date);
                        updated.setHours(
                          stockDate.getHours(),
                          stockDate.getMinutes(),
                        );
                        setStockDate(updated);
                      }
                    }}
                    initialFocus
                  />

                  {/* Time Picker */}
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={format(stockDate, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value
                          .split(":")
                          .map(Number);
                        const updated = new Date(stockDate);
                        updated.setHours(hours);
                        updated.setMinutes(minutes);
                        setStockDate(updated);
                      }}
                      className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-sla text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-800 rounded-xl p-4 space-y-4">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="flex gap-6 border-none border-stone-200 dark:border-stone-700 bg-transparent ">
            <TabsTrigger
              value="items"
              className="relative pb-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white data-[state=active]:bg-transparent data-[state=active]:text-stone-900 dark:text-white 
    after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:w-full 
    after:bg-amber-500 after:scale-x-0 after:transition-transform 
    data-[state=active]:after:scale-x-100"
            >
              Document items
            </TabsTrigger>

            <TabsTrigger
              value="payments"
              className="relative pb-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white data-[state=active]:bg-transparent data-[state=active]:text-stone-900 dark:text-white 
    after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:w-full 
    after:bg-amber-500 after:scale-x-0 after:transition-transform 
    data-[state=active]:after:scale-x-100"
            >
              Payments
            </TabsTrigger>
          </TabsList>

          {/* ================= ITEMS TAB ================= */}
          <TabsContent
            value="items"
            className="space-y-5 mt-4 focus-visible:outline-none"
          >
            {/* Changed grid layout from 2/10 to 3/9 for drastically improved breathing room */}
            <div className="grid grid-cols-12 gap-5 items-start">
              {/* LEFT SIDEBAR: Expanded width, optimized text truncation */}
              <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col min-h-[480px] shadow-sm">
                <div className="space-y-1 mb-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Product Selection
                  </label>
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-sm focus-visible:ring-amber-500"
                  />
                </div>

                {/* Height-bounded container preventing layout jumps */}
                <div className="w-full flex-1 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin">
                  {searchQuery ? (
                    <div className="space-y-1">
                      {allProducts.map((product) => (
                        <div
                          key={product.id}
                          className={cn(
                            "px-3 py-2.5 rounded-lg transition-all cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent",
                            selectedId === product.id
                              ? "bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium shadow-sm"
                              : "text-stone-600 dark:text-stone-300",
                          )}
                          onClick={() => setSelectedId(product.id)}
                          onDoubleClick={() => {
                            setSelectedDocumentProduct(product.id);
                            setOpenNewDocument(true);
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <FaRegFileAlt className="w-4 h-4 text-stone-400 dark:text-stone-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-normal font-medium truncate">
                                {product.title}
                              </p>
                              {product.code && (
                                <p className="text-[10px] font-mono tracking-tight text-stone-400 dark:text-stone-500 truncate mt-0.5">
                                  {product.code}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {allProducts.length === 0 && (
                        <div className="px-3 py-10 text-center text-stone-400 dark:text-stone-500 text-xs">
                          No matching products
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Tree container: Dropped structural border-r that clashes with the card layout */
                    <div className="w-full h-full text-xs">
                      <Tree
                        elements={treeElements}
                        initialExpandedItems={rootGroups.map((g: any) => g.id)}
                        className="h-full bg-transparent"
                      >
                        <RenderTree elements={treeElements} />
                      </Tree>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT CONTENT: Dynamic width matching the grid scaling */}
              <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-4">
                {/* Top Toolbar */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs"
                      disabled={selectedItemIndex === null}
                      onClick={() => {
                        if (selectedItemIndex === null) return;
                        const item = items[selectedItemIndex];
                        setEditingItemIndex(selectedItemIndex);
                        setSelectedDocumentProduct(item.productId);
                        setOpenNewDocument(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5 text-stone-400" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 dark:text-red-400 text-xs"
                      disabled={selectedItemIndex === null}
                      onClick={async () => {
                        if (selectedItemIndex === null) return;
                        const ok = await confirm("Delete this item?");
                        if (!ok) return;
                        setItems((prev) =>
                          prev.filter((_, i) => i !== selectedItemIndex),
                        );
                        setSelectedItemIndex(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* TABLE: Added native responsive overflow wrap */}
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-stone-900">
                  <div className="overflow-x-auto w-full scrollbar-thin">
                    <Table>
                      <TableHeader className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                        <TableRow>
                          {[
                            "ID",
                            "Code",
                            "Name",
                            "Unit",
                            "Qty",
                            "Price before tax",
                            "Tax",
                            "Price",
                            "Discount",
                            "Total before tax",
                            "Total",
                          ].map((header) => (
                            <TableHead
                              key={header}
                              className="text-stone-600 dark:text-stone-400 font-semibold text-xs py-3 whitespace-nowrap"
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center text-stone-400 dark:text-stone-500 h-40 text-xs"
                            >
                              No items added to this document
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item, i) => (
                            <TableRow
                              key={i}
                              onClick={() => setSelectedItemIndex(i)}
                              className={cn(
                                "cursor-pointer transition-colors border-b border-stone-100 dark:border-stone-800/40 last:border-0 hover:bg-stone-50/60 dark:hover:bg-stone-800/30",
                                selectedItemIndex === i
                                  ? "bg-stone-100/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                                  : "",
                              )}
                            >
                              <TableCell className="py-3 text-xs font-medium text-stone-400">
                                {i + 1}
                              </TableCell>
                              <TableCell className="py-3 text-xs whitespace-nowrap font-mono text-[11px]">
                                {item.productId}
                              </TableCell>
                              <TableCell className="py-3 text-xs font-medium max-w-[180px] truncate">
                                {item.name}
                              </TableCell>
                              <TableCell className="py-3 text-xs text-stone-500 whitespace-nowrap">
                                {item.unit}
                              </TableCell>
                              <TableCell className="py-3 text-xs tabular-nums font-medium">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="py-3 text-xs tabular-nums">
                                {item.priceBeforeTax}
                              </TableCell>
                              <TableCell className="py-3 text-xs text-stone-500 whitespace-nowrap">
                                {item.taxes?.length
                                  ? item.taxes
                                      .map((t: any) => `${t.rate}%`)
                                      .join(" + ")
                                  : "0%"}
                              </TableCell>
                              <TableCell className="py-3 text-xs tabular-nums">
                                {(item.quantity * item.priceBeforeTax).toFixed(
                                  2,
                                )}
                              </TableCell>
                              <TableCell className="py-3 text-xs text-stone-500 tabular-nums">
                                {item.discount}
                              </TableCell>
                              <TableCell className="py-3 text-xs tabular-nums">
                                {item.quantity * item.priceBeforeTax}
                              </TableCell>
                              <TableCell className="py-3 text-xs font-semibold text-right tabular-nums text-stone-900 dark:text-stone-100">
                                {Number(item.total).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* DISCOUNT + TOTALS */}
                <div className="flex flex-col lg:flex-row justify-end items-end lg:items-center gap-4 pt-3 border-t border-stone-100 dark:border-stone-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select defaultValue="after">
                      <SelectTrigger className="h-9 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 w-44 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
                        <SelectItem value="after" className="text-xs">
                          Apply discount after tax
                        </SelectItem>
                        <SelectItem value="before" className="text-xs">
                          Apply discount before tax
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select defaultValue="percent">
                      <SelectTrigger className="h-9 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
                        <SelectItem value="percent" className="text-xs">
                          Discount %
                        </SelectItem>
                        <SelectItem value="amount" className="text-xs">
                          Discount Amt
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative flex items-center">
                      <Input
                        defaultValue="0"
                        className="h-9 w-20 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-right pr-6 text-xs tabular-nums focus-visible:ring-amber-500"
                      />
                      <span className="absolute right-2.5 text-stone-400 text-xs pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-72 text-right space-y-1.5 text-xs p-3.5 rounded-xl bg-stone-100/60 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800/40">
                    <div className="flex justify-between gap-10">
                      <span className="text-stone-500 dark:text-stone-400">
                        Total before tax:
                      </span>
                      <span className="font-medium tabular-nums">
                        {totals.totalBeforeTax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-10">
                      <span className="text-stone-500 dark:text-stone-400">
                        Tax:
                      </span>
                      <span className="font-medium tabular-nums">
                        {totals.taxTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-10 font-bold text-sm pt-1.5 border-t border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">
                      <span>Total:</span>
                      <span className="tabular-nums text-amber-600 dark:text-amber-400">
                        {totals.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NOTES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-stone-500 dark:text-stone-400 text-xs font-medium">
                      Internal note
                    </label>
                    <Textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-xs min-h-[75px] focus-visible:ring-amber-500 focus-visible:ring-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-stone-500 dark:text-stone-400 text-xs font-medium">
                      Note
                    </label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-xs min-h-[75px] focus-visible:ring-amber-500 focus-visible:ring-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-800 rounded-xl p-4 flex flex-col min-h-125">
              {/* ================= TOP TOOLBAR ================= */}
              <div className="flex items-center gap-3 border-b border-stone-200 dark:border-stone-700 pb-3">
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    setOpenPayment(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>

                <Button
                  variant="outline"
                  className="border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                  disabled={selectedPaymentIndex === null}
                  onClick={() => {
                    if (selectedPaymentIndex === null) return;

                    setEditingPaymentIndex(selectedPaymentIndex);
                    setOpenPayment(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  className="border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-red-400"
                  disabled={selectedPaymentIndex === null}
                  onClick={async () => {
                    if (selectedPaymentIndex === null) return;

                    const ok = await confirm("Delete this payment?");
                    if (!ok) return;

                    setPayments((prev) =>
                      prev.filter((_, i) => i !== selectedPaymentIndex),
                    );

                    setSelectedPaymentIndex(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>

              {/* ================= TABLE ================= */}
              <div className="flex-1 mt-4 border border-stone-200 dark:border-stone-700 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-white dark:bg-stone-800 border-b border-amber-600">
                    <TableRow>
                      <TableHead className="text-stone-700 dark:text-stone-300">
                        ID
                      </TableHead>
                      <TableHead className="text-stone-700 dark:text-stone-300">
                        Status
                      </TableHead>
                      <TableHead className="text-stone-700 dark:text-stone-300">
                        Payment type
                      </TableHead>
                      <TableHead className="text-stone-700 dark:text-stone-300">
                        Date
                      </TableHead>
                      <TableHead className="text-stone-700 dark:text-stone-300">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-stone-500 h-64"
                        >
                          No payments added
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment, i) => (
                        <TableRow
                          key={payment.id}
                          onClick={() => setSelectedPaymentIndex(i)}
                          className={cn(
                            "cursor-pointer hover:bg-white dark:bg-stone-800",
                            selectedPaymentIndex === i &&
                              "bg-stone-100 dark:bg-stone-700",
                          )}
                        >
                          <TableCell>{i + 1}</TableCell>

                          <TableCell>
                            <span
                              className={cn(
                                "px-2 py-1 rounded text-xs",
                                payment.status
                                  ? "bg-emerald-600/20 text-emerald-400"
                                  : "bg-yellow-600/20 text-yellow-400",
                              )}
                            >
                              {payment.status ? "Completed" : "Pending"}
                            </span>
                          </TableCell>

                          <TableCell className="capitalize">
                            {payment.type}
                          </TableCell>

                          <TableCell>
                            {payment.date
                              ? format(new Date(payment.date), "M/d/yyyy")
                              : "-"}
                          </TableCell>

                          <TableCell>{payment.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ================= TOTALS ================= */}
              <div className="flex justify-end mt-4">
                <div className="text-right space-y-1 text-xs">
                  <div className="flex justify-between gap-20">
                    <span className="text-stone-500 dark:text-stone-400">
                      Document total:
                    </span>
                    <span>{totals.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-20">
                    <span className="text-stone-500 dark:text-stone-400">
                      Payments total:
                    </span>
                    <span>{totals.paymentsTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* ================= FOOTER ACTIONS ================= */}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-6 border-t border-stone-200 dark:border-stone-700">
          <Button
            variant="outline"
            className="border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              <FileText className="h-4 w-4 mr-2" />
              Save as PDF
            </Button>
            <Button
              variant="outline"
              className="border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print preview
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={async () => {
                try {
                  if (!customerId) {
                    toast.error("Select a customer");
                    return;
                  }

                  if (items.length === 0) {
                    toast.error("Add at least one item");
                    return;
                  }

                  if (totals.paymentsTotal > totals.total) {
                    toast.error("Payments exceed document total");
                    return;
                  }

                  const documentId = document?.id ?? crypto.randomUUID();

                  const payload = {
                    id: documentId, // <-- top-level id
                    document: {
                      number: docNumber,
                      externalNumber,
                      customerId,
                      date: date ?? new Date(),
                      dueDate: dueDate ?? null,
                      stockDate,
                      paid,
                      totalBeforeTax: totals.totalBeforeTax,
                      taxTotal: totals.taxTotal,
                      total: totals.total,
                      type: documentType ?? 200,
                    },
                    items: items.map((item) => ({
                      ...item,
                      taxes: item.taxes ?? [],
                      documentId,
                      id: item.id ?? crypto.randomUUID(),
                    })),
                    payments, // optional
                  };

                  if (isEdit) {
                    await updateDocument.mutateAsync(payload);
                    toast.success("Document updated");
                  } else {
                    await createDocument.mutateAsync({
                      document: {
                        id: documentId,
                        number: docNumber,
                        externalNumber,
                        customerId,
                        date: date ?? new Date(),
                        dueDate: dueDate ?? null,
                        stockDate,
                        paid,
                        totalBeforeTax: totals.totalBeforeTax,
                        taxTotal: totals.taxTotal,
                        total: totals.total,
                        type: documentType ?? 200,
                        createdAt: new Date(),
                      },
                      items: items.map((item) => ({
                        ...item,
                        taxes: item.taxes ?? [],
                        documentId,
                        id: item.id ?? crypto.randomUUID(),
                      })),
                      payments,
                    });
                    toast.success("Document created");
                  }
                  onClose?.();
                } catch (error) {
                  toast.error("Error saving document");
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
