import { icons, type LucideIcon } from "lucide-react";

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName;
  "aria-hidden"?: React.AriaAttributes["aria-hidden"];
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

const Icon = (props: IconProps) => {
  const { name, size = 20, color, style, className } = props;

  const DynamicIcon: LucideIcon = icons[name] ?? icons.LoaderCircle;

  return (
    <DynamicIcon
      aria-hidden={props["aria-hidden"]}
      color={color}
      size={size}
      style={{ ...style, display: "block" }}
      className={className}
    />
  );
};

export default Icon;
