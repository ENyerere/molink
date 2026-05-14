import { cn } from "../lib/utils";

interface MolinkLogoProps {
  className?: string;
  size?: number;
  color?: string;
  variant?: string;
}

export function MolinkLogo({
  className,
  size = 32,
  color = "#2563EB",
}: MolinkLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-label="Molink Logo"
    >
      <path
        fill={color}
        d="M 37.5,12 A 40,40 0 1,0 62.5,12 L 53,48 A 3,3 0 0,1 47,48 Z"
      />
    </svg>
  );
}

export default MolinkLogo;
