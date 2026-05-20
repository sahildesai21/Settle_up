import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-primary to-primary/70",
  "from-accent to-accent/70",
  "from-negative to-negative/70",
  "from-positive to-positive/70",
  "from-primary/80 to-accent/60",
  "from-accent/80 to-negative/50",
];

interface MemberAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MemberAvatar({ name, size = "md", className }: MemberAvatarProps) {
  const index = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center font-display font-bold text-primary-foreground shrink-0",
        AVATAR_COLORS[index],
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
