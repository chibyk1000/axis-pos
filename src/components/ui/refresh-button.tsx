"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onRefresh?: () => void | Promise<any>;
  isLoading?: boolean;
  iconClassName?: string;
  showLabel?: boolean;
  label?: string;
  variant?: "ghost" | "toolbar" | "outline" | "solid";
  size?: "sm" | "default" | "xs";
}

export function RefreshButton({
  onRefresh,
  isLoading = false,
  className,
  iconClassName,
  showLabel = false,
  label = "Refresh",
  variant = "ghost",
  size = "default",
  children,
  onClick,
  ...props
}: RefreshButtonProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnimating(true);
    onClick?.(e);
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.error("Refresh error:", err);
      }
    }
    setTimeout(() => {
      setAnimating(false);
    }, 650);
  };

  const isSpinning = isLoading || animating;

  const sizeClasses = {
    xs: "p-1 text-xs gap-1",
    sm: "px-2.5 py-1 text-xs gap-1.5",
    default: "px-3 py-1.5 text-sm gap-2",
  }[size];

  const variantClasses = {
    ghost:
      "text-stone-500 dark:text-stone-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 rounded transition-all active:scale-95",
    toolbar:
      "flex flex-col items-center justify-center p-2 text-stone-600 dark:text-stone-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded transition-all active:scale-95",
    outline:
      "border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-500 hover:text-amber-500 dark:hover:text-amber-400 rounded transition-all active:scale-95",
    solid:
      "bg-amber-500 text-stone-900 hover:bg-amber-400 font-medium rounded transition-all active:scale-95",
  }[variant];

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      className={cn(
        "inline-flex items-center justify-center select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-amber-500",
        sizeClasses,
        variantClasses,
        className,
      )}
      {...props}
    >
      <RefreshCw
        className={cn(
          "w-4 h-4 transition-transform",
          isSpinning && "animate-spin text-amber-500",
          iconClassName,
        )}
      />
      {children ?? (showLabel && <span>{label}</span>)}
    </button>
  );
}

export default RefreshButton;
