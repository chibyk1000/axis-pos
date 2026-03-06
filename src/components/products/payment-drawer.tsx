"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";

export default function PaymentDrawer({
  open,
  setOpen,
}: {
  open: boolean;     
  setOpen: (val: boolean) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState(315);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="ml-auto h-full w-95 rounded-none border-l border-slate-700 bg-slate-900 text-slate-200">
        {/* Header */}
        <DrawerHeader className="border-b border-slate-700 flex flex-row items-center justify-between">
          <DrawerTitle className="text-slate-100 text-lg">
            New payment
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-4 space-y-6">
          {/* Payment type */}
          <div className="space-y-1">
            <Label className="text-slate-400">Payment type</Label>

            <div className="flex items-center gap-2">
              <Select defaultValue="cash">
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600">
                <Check size={14} className="text-white" />
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label className="text-slate-400">Date</Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-slate-800 border-slate-700 text-white hover:bg-slate-800"
                >
                  {date ? format(date, "M/d/yyyy") : "Pick date"}
                  <CalendarIcon size={16} />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="p-0 bg-slate-900 border-slate-700">
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label className="text-slate-400">Amount</Label>

            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="bg-slate-800 border-slate-700 text-white text-right"
            />
          </div>
        </div>

        {/* Footer */}
        <DrawerFooter className="flex-row gap-3 border-t border-slate-700 p-4">
          <Button className="flex-1 bg-slate-700 hover:bg-slate-600">
            ✓ OK
          </Button>

          <Button
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            ✕ Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
