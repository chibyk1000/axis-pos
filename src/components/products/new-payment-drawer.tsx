"use client";

import { useEffect, useState } from "react";
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

import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "../ui/switch";
import { usePaymentTypes } from "@/hooks/controllers/paymentTypes";

interface Payment {
  id?: string;
  type: string;
  date?: Date;
  amount: number;
  status: boolean;
}

interface PaymentDrawerProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  payment?: Payment | null;
  onSubmit?: (data: Payment) => void;
}

export default function PaymentDrawer({
  open,
  setOpen,
  onSubmit,
  payment,
}: PaymentDrawerProps) {
  const { data: paymentTypes = [] } = usePaymentTypes();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<boolean>(true);

  const resetForm = () => {
    setType("");
    setDate(new Date());
    setAmount(0);
    setStatus(true);
  };

  useEffect(() => {
    if (payment) {
      setType(payment.type);
      setDate(payment.date ?? new Date());
      setAmount(payment.amount);
      setStatus(payment.status);
    } else {
      resetForm();
    }
  }, [payment, open]);

  const handleSubmit = () => {
    const payload: Payment = {
      ...payment,
      type,
      date,
      amount,
      status,
    };

    onSubmit?.(payload);

    resetForm();
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="ml-auto h-full w-[380px] rounded-none border-l border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
        {/* Header */}
        <DrawerHeader className="border-b border-stone-200 dark:border-stone-700 flex flex-row items-center justify-between">
          <DrawerTitle className="text-stone-900 dark:text-stone-100 text-lg">
            {payment ? "Edit payment" : "New payment"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-4 space-y-6">
          {/* Payment type */}
          <div className="space-y-1">
            <Label className="text-stone-500 dark:text-stone-400">
              Payment type
            </Label>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>

              <SelectContent className="bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white top-10">
                {paymentTypes.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label className="text-stone-500 dark:text-stone-400">Date</Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white hover:bg-white dark:bg-stone-800"
                >
                  {date ? format(date, "M/d/yyyy") : "Pick date"}
                  <CalendarIcon size={16} />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="p-0 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700">
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-stone-500 dark:text-stone-400">Status</Label>

            <div className="flex items-center gap-3">
              <Switch checked={status} onCheckedChange={setStatus} />

              <span className="text-sm text-stone-700 dark:text-stone-300">
                {status ? "Completed" : "Pending"}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label className="text-stone-500 dark:text-stone-400">Amount</Label>

            <Input
              type="number"
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <DrawerFooter className="flex-row gap-3 border-t border-stone-200 dark:border-stone-700 p-4">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-stone-100 dark:bg-stone-700 hover:bg-stone-600"
          >
            ✓ OK
          </Button>

          <Button
            variant="outline"
            className="flex-1 border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-white dark:bg-stone-800"
            onClick={() => setOpen(false)}
          >
            ✕ Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
