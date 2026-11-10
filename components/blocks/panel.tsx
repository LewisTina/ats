import Icon, { IconName } from "../ui/icons";

export default function Panel(
  props: React.PropsWithChildren<{
    icon: IconName;
    indication: string;
    action?: React.ReactNode;
    title: string;
  }>,
) {
  const { icon, indication, title, children, action } = props;
  return (
    <div className="flex flex-col shadow-xs transition-all self-stretch">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-muted text-foreground/80">
            <Icon name={icon} className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/50 font-medium">
            {indication}
          </span>
          {action}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5 relative">{children}</div>
    </div>
  );
}
