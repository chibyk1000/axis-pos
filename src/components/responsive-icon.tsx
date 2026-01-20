import { LucideIcon } from "lucide-react";
import clsx from "clsx";

type Props = {
  icon: LucideIcon | React.ComponentType<any>;
  className?: string;
};

export function ResponsiveIcon({ icon: Icon, className }: Props) {
  return (
    <Icon
      className={clsx(
        "w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12",
        className,
      )}
    />
  );
}
