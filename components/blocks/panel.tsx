import Icon, { IconName } from "../ui/icons";

export default function Panel(
  props: React.PropsWithChildren<{
    icon: IconName;
    indication?: string;
    action?: React.ReactNode;
    title: string;
    subtitle?: string;
  }>,
) {
  const { icon, indication, title, children, action, subtitle } = props;
  return (
    <div className="flex flex-col shadow-xs transition-all self-stretch">
      <div className="flex items-center justify-between p-3 sm:p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex p-2 items-center justify-center rounded-md bg-surface-muted text-foreground/80">
            <Icon name={icon} className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-foreground/60">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {indication && (
            <span className="text-sm text-foreground/50 font-medium">
              {indication}
            </span>
          )}
          {action}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-3 sm:p-5 relative">{children}</div>
    </div>
  );
}
