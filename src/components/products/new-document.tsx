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

import { randomUUID } from "crypto";
import { useMemo } from "react";
import { useCreateDocument } from "@/hooks/controllers/documents";

export default function NewDocument( {title}:{title:string}) {
      const [date, setDate] = useState<Date | undefined>(new Date());
      const [dueDate, setDueDate] = useState<Date | undefined>(
        new Date(),
      );
    const [paid, setPaid] = useState(false);
    const [stockDate, setStockDate] = useState<Date>(new Date());
const [externalNumber, setExternalNumber] = useState("");
const [customerId, setCustomerId] = useState<string | undefined>();
const createDocument = useCreateDocument();
const [items, setItems] = useState<any[]>([]);
const [payments, setPayments] = useState<any[]>([]);

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

      <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-4 space-y-4">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-sky-600 data-[state=active]:text-white"
            >
              Document items
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-sky-600 data-[state=active]:text-white"
            >
              Payments
            </TabsTrigger>
          </TabsList>

          {/* ================= ITEMS TAB ================= */}
          <TabsContent value="items" className="space-y-4 mt-4">
            <div className="grid grid-cols-12 gap-4">
              {/* LEFT SIDEBAR */}
              <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-md p-3">
                <Button className="w-full bg-sky-600 hover:bg-sky-700">
                  Products
                </Button>
              </div>

              {/* RIGHT CONTENT */}
              <div className="col-span-10 space-y-4">
                {/* Top Toolbar */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Product name"
                      className="pl-9 bg-slate-800 border-slate-700"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-800"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-red-400"
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
                        <TableHead>ID</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price before tax</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Total before tax</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      <TableRow className="hover:bg-slate-800">
                        <TableCell
                          colSpan={11}
                          className="text-center text-slate-500 h-40"
                        >
                          No items added
                        </TableCell>
                      </TableRow>
                    </TableBody>
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
                <div className="flex justify-between items-center pt-6 border-t border-slate-700">
                  <Button
                    variant="outline"
                    className="border-slate-700 bg-slate-800 text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-800"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Save as PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-800"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print preview
                    </Button>
                    <Button
                      className="bg-sky-600 hover:bg-sky-700"
                      onClick={() => {
                        if (!customerId) return;

                        createDocument.mutate({
                          document: {
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
                        id: crypto.randomUUID()
                          },
                          items,
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
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[500px]">
              {/* ================= TOP TOOLBAR ================= */}
              <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                <Button className="bg-sky-600 hover:bg-sky-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>

                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-red-400"
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
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    <TableRow className="hover:bg-slate-800">
                      <TableCell
                        colSpan={5}
                        className="text-center text-slate-500 h-64"
                      >
                        No payments added
                      </TableCell>
                    </TableRow>
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
              <div className="flex justify-between items-center pt-6 border-t border-slate-700 mt-6">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-slate-700 bg-slate-800"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Save as PDF
                  </Button>

                  <Button
                    variant="outline"
                    className="border-slate-700 bg-slate-800"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print preview
                  </Button>

                  <Button className="bg-sky-600 hover:bg-sky-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
