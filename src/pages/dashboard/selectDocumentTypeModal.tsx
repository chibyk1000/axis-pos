"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: DocumentType | null) => void;
};

export type DocumentType = {
  code: number;
  label: string;
  category?:string
};

type Category = {
  name: string;
  types: DocumentType[];
};

const categories: Category[] = [
  {
    name: "Expenses",
    types: [
      { code: 100, label: "Purchase" },
      { code: 120, label: "Stock Return" },
    ],
  },
  {
    name: "Sales",
    types: [
      { code: 200, label: "Sales" },
      { code: 220, label: "Refund" },
      { code: 230, label: "Proforma" },
    ],
  },
  {
    name: "Inventory",
    types: [{ code: 300, label: "Inventory count" }],
  },
  {
    name: "Loss",
    types: [{ code: 400, label: "Loss and damage" }],
  },
];
export default function SelectDocumentTypeModal({
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>();
  const [selectedType, setSelectedType] = React.useState<DocumentType | null>(
    null,
  );

console.log(selectedType);

React.useEffect(() => {
  if (!open) {
    setSelectedCategory(null);
    setSelectedType(null);
  } else {
    setSelectedCategory(categories[0]);
  }
}, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 max-w-2xl p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Select document type
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex h-87.5 border-t border-slate-200 dark:border-slate-700">
          {/* Left Side - Categories */}
          <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 p-4 space-y-1">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  setSelectedCategory(category);
               
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                  selectedCategory?.name === category.name
                    ? "bg-sky-600 text-slate-900 dark:text-white"
                    : "hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Right Side - Types */}
          <div className="flex-1 p-4">
            <div className="space-y-1">
              {selectedCategory?.types.map((type) => (
                <button
                  key={type.code}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded text-sm transition-colors flex gap-2",
                    selectedType?.code === type.code
                      ? "bg-sky-600 text-slate-900 dark:text-white"
                      : "hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
                  )}
                >
                  <span className="font-medium">
                    {type.code} 
                  </span>
                  <span className="opacity-80">-</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <Button
            variant="outline"
            className="bg-slate-100 dark:bg-slate-700 border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-600"
            onClick={() => onOpenChange(false)}
          >
            ✕ Cancel
          </Button>

          <Button
            className="bg-sky-600 hover:bg-sky-500 text-slate-900 dark:text-white"
            disabled={!selectedType}
            onClick={() => {
              onConfirm(selectedType);
              onOpenChange(false);
            }}
          >
            ✓ OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
