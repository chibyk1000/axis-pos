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
import { Search, Pencil, Trash2, Save, Printer, FileText } from "lucide-react";
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
import { useCreateDocument } from "@/hooks/controllers/documents";
import { File, Folder, Tree, TreeViewElement } from "../ui/file-tree";
import { useNodeTree, useRootNodes } from "@/hooks/controllers/nodes";

import { confirm } from "@tauri-apps/plugin-dialog";
import { FaFile, FaRegFileAlt } from "react-icons/fa";
import { useProduct, useProductById } from "@/hooks/controllers/products";
import DocumentProductDrawer from "./new-document-drawer";
import { Product } from "@/db/schema";
import PaymentDrawer from "./new-payment-drawer";

export default function NewDocument( {title}:{title:string}) {
      const [date, setDate] = useState<Date | undefined>(new Date());
      const [dueDate, setDueDate] = useState<Date | undefined>(
        new Date(),
      );
  const [openNewDocument, setOpenNewDocument] = useState(false)
   const [selectedId, setSelectedId] = useState("");
  const [paid, setPaid] = useState(false);
  
  const { data: rootGroups = [] } = useRootNodes();
  // const { data } = useNodeTree()

  const [selectedDocumentProduct, setSelectedDocumentProduct] = useState<string>("")
const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
   const { data: product } = useProductById(selectedDocumentProduct);
    const [stockDate, setStockDate] = useState<Date>(new Date());
const [externalNumber, setExternalNumber] = useState("");
const [customerId, setCustomerId] = useState<string | undefined>();
const createDocument = useCreateDocument();
  const [items, setItems] = useState<any[]>([]);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<
    number | null
  >(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [openPayment, setOpenPayment] = useState(false)
const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(
  null,
);

const [editingPayment, setEditingPayment] = useState<any | null>(null);
const mapGroupsToTree = (groups: any[]): TreeViewElement[] => {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: "group",
    isSelectable: true,
    children: [
      ...(group.children ? mapGroupsToTree(group.children) : []),

      ...(group.products ?? []).map((p: any) => ({
        id: p.id,
        name: p.title,
        type: "product",
        isSelectable: true,
      })),
    ],
  }));
};
    const treeElements = mapGroupsToTree(rootGroups);
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
              selectedId === el.id ? "bg-white/10" : "hover:bg-white/5",
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(el.id);
            }}
          >
            {isFolder ? (
              <Folder value={el.id} element={el.name}>
                <RenderTree elements={el.children ?? []} />
              </Folder>
            ) : (
              <File
                value={el.id}
                onDoubleClick={() => {


                  setSelectedDocumentProduct(el.id)
                 setOpenNewDocument(true)
                  
                }}
                  fileIcon={<FaRegFileAlt/>}
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


 
const [internalNote, setInternalNote] = useState("");
  const [note, setNote] = useState("");
  
  const totals = useMemo(() => {
    const totalBeforeTax = items.reduce(
      (sum, item) => sum + item.quantity * item.priceBeforeTax,
      0,
    );

    const taxTotal = items.reduce((sum, item) => {
      const line = item.quantity * item.priceBeforeTax;
      return sum + line * (item.taxRate / 100);
    }, 0);

    const total = totalBeforeTax + taxTotal;

    const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalBeforeTax,
      taxTotal,
      total,
      paymentsTotal,
    };
  }, [items, payments]);
    const { data: customers } = useCustomers()
  
    
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6">
      <DocumentProductDrawer
        open={openNewDocument}
        setOpen={(val) => {
          setOpenNewDocument(val);
          if (!val) setEditingItemIndex(null);
        }}
        product={product as Product}
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
      <div className="w-full bg-slate-900 text-slate-100 p-6 rounded-xl shadow-lg border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT SIDE */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-400">Number</Label>
              <Input
                readOnly
                value={title}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400">External document</Label>
              <Input
                value={externalNumber}
                onChange={(e) => setExternalNumber(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400">Supplier</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
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
                <Label className="text-slate-400">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-800 border-slate-700 text-slate-100",
                        !date && "text-slate-500",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "M/d/yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                    <Calendar
                      mode="single"
                      selected={date}
                      classNames={{
                        day_button: "text-sky-200",

                        today: "bg-sky-500 text-sky-100",
                        selected: "bg-sky-500",
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
                  className="border-slate-600 data-[state=checked]:bg-emerald-500"
                />
                <Label className="text-slate-300">Paid</Label>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-slate-400">Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-slate-800 border-slate-700 text-slate-100",
                      !dueDate && "text-slate-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "M/d/yyyy") : "Pick due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    classNames={{
                      day_button: "text-sky-200",

                      today: "bg-sky-500 text-sky-100",
                      selected: "bg-sky-500",
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
              <Label className="text-slate-400 text-sm">Stock date</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-normal"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-200 font-medium">
                      {format(stockDate, "M/d/yyyy h:mm a")}
                    </span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-3 bg-slate-900 border-slate-700 space-y-3">
                  <Calendar
                    mode="single"
                    selected={stockDate}
                    classNames={{
                      day_button: "text-sky-200",

                      today: "bg-sky-500 text-sky-100",
                      selected: "bg-sky-500",
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
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-sla text-slate-100 border border-slate-800 rounded-xl p-4 space-y-4">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="flex gap-6 border-none border-slate-700 bg-transparent ">
            <TabsTrigger
              value="items"
              className="relative pb-2 text-slate-400 hover:text-white data-[state=active]:bg-transparent data-[state=active]:text-white 
    after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:w-full 
    after:bg-sky-500 after:scale-x-0 after:transition-transform 
    data-[state=active]:after:scale-x-100"
            >
              Document items
            </TabsTrigger>

            <TabsTrigger
              value="payments"
              className="relative pb-2 text-slate-400 hover:text-white data-[state=active]:bg-transparent data-[state=active]:text-white 
    after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:w-full 
    after:bg-sky-500 after:scale-x-0 after:transition-transform 
    data-[state=active]:after:scale-x-100"
            >
              Payments
            </TabsTrigger>
          </TabsList>

          {/* ================= ITEMS TAB ================= */}
          <TabsContent value="items" className="space-y-4 mt-4">
            <div className="grid grid-cols-12 gap-4">
              {/* LEFT SIDEBAR */}
              <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-md p-3">
                <Input type="text" placeholder="Search prodct" />

                <div className="w-56 border-r border-slate-800 overflow-y-auto">
                  <div className="w-56  border-r border-slate-800 pt-3">
                    <Tree
                      elements={treeElements}
                      initialExpandedItems={rootGroups.map((g: any) => g.id)}
                      className="h-full"
                    >
                      <RenderTree elements={treeElements} />
                    </Tree>
                  </div>
                </div>
              </div>

              {/* RIGHT CONTENT */}
              <div className="col-span-10 space-y-4">
                {/* Top Toolbar */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-800"
                      disabled={selectedItemIndex === null}
                      onClick={() => {
                        if (selectedItemIndex === null) return;

                        const item = items[selectedItemIndex];

                        setEditingItemIndex(selectedItemIndex);
                        setSelectedDocumentProduct(item.productId);
                        setOpenNewDocument(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-red-400"
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
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* TABLE */}
                <div className="border border-slate-700 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-800 border-b border-sky-600">
                      <TableRow>
                        <TableHead className="text-slate-300">ID</TableHead>
                        <TableHead className="text-slate-300">Code</TableHead>
                        <TableHead className="text-slate-300">Name</TableHead>
                        <TableHead className="text-slate-300">Unit</TableHead>
                        <TableHead className="text-slate-300">Qty</TableHead>
                        <TableHead className="text-slate-300">
                          Price before tax
                        </TableHead>
                        <TableHead className="text-slate-300">Tax</TableHead>
                        <TableHead className="text-slate-300">Price</TableHead>
                        <TableHead className="text-slate-300">
                          Discount
                        </TableHead>
                        <TableHead className="text-slate-300">
                          Total before tax
                        </TableHead>
                        <TableHead className="text-slate-300">Total</TableHead>
                      </TableRow>
                    </TableHeader>

                    <>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center text-slate-500 h-40"
                            >
                              No items added
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item, i) => (
                            <TableRow
                              key={i}
                              onClick={() => setSelectedItemIndex(i)}
                              className={cn(
                                "cursor-pointer hover:bg-slate-800",
                                selectedItemIndex === i && "bg-slate-700",
                              )}
                            >
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{item.productId}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.priceBeforeTax}</TableCell>
                              <TableCell>{item.taxRate}</TableCell>
                              <TableCell>
                                {(item.quantity * item.priceBeforeTax).toFixed(
                                  2,
                                )}
                              </TableCell>
                              <TableCell>{item.discount}</TableCell>
                              <TableCell>
                                {item.quantity * item.priceBeforeTax}
                              </TableCell>
                              <TableCell>{item.total}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </>
                  </Table>
                </div>

                {/* DISCOUNT + TOTALS */}
                <div className="flex justify-end gap-10 pt-4">
                  <div className="flex items-center gap-4">
                    <Select defaultValue="after">
                      <SelectTrigger className="bg-slate-800 border-slate-700 w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="after">
                          Apply discount after tax
                        </SelectItem>
                        <SelectItem value="before">
                          Apply discount before tax
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select defaultValue="percent">
                      <SelectTrigger className="bg-slate-800 border-slate-700 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="percent">
                          Discount percent
                        </SelectItem>
                        <SelectItem value="amount">Discount amount</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      defaultValue="0"
                      className="w-20 bg-slate-800 border-slate-700 text-right"
                    />
                    <span className="text-slate-400">%</span>
                  </div>

                  <div className="text-right space-y-1 text-sm">
                    <div className="flex justify-between gap-20">
                      <span className="text-slate-400">Total before tax:</span>
                      <span>{totals.totalBeforeTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-20">
                      <span className="text-slate-400">Tax:</span>
                      <span>{totals.taxTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-20 font-semibold text-lg">
                      <span>Total:</span>
                      <span>{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* NOTES */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="text-slate-400 text-sm">
                      Internal note
                    </label>
                    <Textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      className="bg-slate-800 border-slate-700 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm">Note</label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="bg-slate-800 border-slate-700 mt-1"
                    />
                  </div>
                </div>

                {/* FOOTER ACTIONS */}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-4 flex flex-col min-h-125">
              {/* ================= TOP TOOLBAR ================= */}
              <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                <Button
                  className="bg-sky-600 hover:bg-sky-700"
                  onClick={() => {
                    setOpenPayment(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>

                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800"
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
                  className="border-slate-700 bg-slate-800 text-red-400"
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
              <div className="flex-1 mt-4 border border-slate-700 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-800 border-b border-sky-600">
                    <TableRow>
                      <TableHead className="text-slate-300">ID</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">
                        Payment type
                      </TableHead>
                      <TableHead className="text-slate-300">Date</TableHead>
                      <TableHead className="text-slate-300">Amount</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-slate-500 h-64"
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
                            "cursor-pointer hover:bg-slate-800",
                            selectedPaymentIndex === i && "bg-slate-700",
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
                <div className="text-right space-y-1 text-sm">
                  <div className="flex justify-between gap-20">
                    <span className="text-slate-400">Document total:</span>
                    <span>{totals.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-20">
                    <span className="text-slate-400">Payments total:</span>
                    <span>{totals.paymentsTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* ================= FOOTER ACTIONS ================= */}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-6 border-t border-slate-700">
          <Button
            variant="outline"
            className="border-slate-700 bg-slate-800 text-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-700 bg-slate-800">
              <FileText className="h-4 w-4 mr-2" />
              Save as PDF
            </Button>
            <Button variant="outline" className="border-slate-700 bg-slate-800">
              <Printer className="h-4 w-4 mr-2" />
              Print preview
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={() => {
                if (!customerId) {
                  alert("Select a customer");
                  return;
                }

                if (items.length === 0) {
                  alert("Add at least one item");
                  return;
                }

                const documentId = crypto.randomUUID();

                createDocument.mutate({
                  document: {
                    id: documentId,
                    number: title,
                    externalNumber,
                    customerId,
                    date: date ?? new Date(),
                    dueDate: dueDate ?? null,
                    stockDate,
                    paid,
                    totalBeforeTax: totals.totalBeforeTax,
                    taxTotal: totals.taxTotal,
                    total: totals.total,
                    createdAt: new Date(),
                  },
                  items: items.map((item) => ({
                    ...item,
                    documentId,
                    id: crypto.randomUUID(),
                  })),
                  payments,
                });
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
