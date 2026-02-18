import { cn } from "@/lib/utils";

interface GradientBlobsProps {
  className?: string;
  variant?: "default" | "subtle" | "vibrant";
}

export function GradientBlobs({ className, variant = "default" }: GradientBlobsProps) {
  const opacityClass = {
    default: "opacity-30 dark:opacity-20",
    subtle: "opacity-20 dark:opacity-10",
    vibrant: "opacity-40 dark:opacity-30",
  }[variant];

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden -z-10",
        className
      )}
      aria-hidden="true"
    >
      {/* Purple blob - top right */}
      <div
        className={cn(
          "absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-[120px]",
          "bg-[hsl(270_75%_60%)]",
          opacityClass,
          "animate-blob"
        )}
      />

      {/* Pink/Magenta blob - center left */}
      <div
        className={cn(
          "absolute top-1/3 -left-32 h-[400px] w-[400px] rounded-full blur-[100px]",
          "bg-[hsl(330_85%_60%)]",
          opacityClass,
          "animate-blob animation-delay-2000"
        )}
      />

      {/* Cyan/Teal blob - bottom center */}
      <div
        className={cn(
          "absolute -bottom-40 left-1/3 h-[450px] w-[450px] rounded-full blur-[110px]",
          "bg-[hsl(180_70%_50%)]",
          opacityClass,
          "animate-blob animation-delay-4000"
        )}
      />

      {/* Orange blob - bottom right (subtle) */}
      <div
        className={cn(
          "absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full blur-[90px]",
          "bg-[hsl(32_95%_60%)]",
          "opacity-20 dark:opacity-10",
          "animate-blob animation-delay-3000"
        )}
      />
    </div>
  );
}
