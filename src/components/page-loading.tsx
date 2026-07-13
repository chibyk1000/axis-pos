import { Loader2 } from "lucide-react";

type PageLoadingProps = {
  label?: string;
  className?: string;
};

export function PageLoading({
  label = "Loading",
  className = "",
}: PageLoadingProps) {
  return (
    <div
      className={`flex h-full min-h-[220px] w-full items-center justify-center bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-400 ${className}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}
