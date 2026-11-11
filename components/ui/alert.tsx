import React from "react";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "./icons";

type AlertVariant = "success" | "warning" | "error";

type AlertContent =
  | { title: string; description?: string }
  | { title?: string; description: string };

type AlertProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> &
  AlertContent & {
    variant: AlertVariant;
    icon?: IconName;
  };

const variantClasses: Record<AlertVariant, string> = {
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

const variantIcons: Record<AlertVariant, IconName> = {
  success: "CircleCheck",
  warning: "TriangleExclamationPoint",
  error: "CircleX",
};

export default function Alert({
  variant,
  icon = variantIcons[variant],
  className,
  title,
  description,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === "success" ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className="w-full max-w-screen-2xl mx-auto flex items-start gap-3">
        <Icon
          name={icon}
          size={16}
          aria-hidden="true"
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 space-y-1">
          {title && <p className="font-semibold">{title}</p>}
          {description && <p className="opacity-90 text-xs">{description}</p>}
        </div>
      </div>
    </div>
  );
}
