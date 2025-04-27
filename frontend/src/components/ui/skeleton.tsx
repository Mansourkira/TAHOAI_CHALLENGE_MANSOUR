import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700/40",
        className
      )}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="mb-6 max-w-[85%] rounded-lg p-4 mr-auto bg-white dark:bg-neutral-700/70 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Skeleton className="h-3 w-16 mb-1 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[75%]" />
        <Skeleton className="h-4 w-[60%]" />
        <Skeleton className="h-4 w-[80%]" />
      </div>
    </div>
  );
}

export function ThinkingDots() {
  return (
    <div className="flex items-center space-x-1 p-3 mb-4 max-w-fit rounded-lg mr-auto bg-white dark:bg-neutral-700/70">
      <div className="thinking-dot bg-neutral-400 dark:bg-neutral-400"></div>
      <div className="thinking-dot animation-delay-200 bg-neutral-400 dark:bg-neutral-400"></div>
      <div className="thinking-dot animation-delay-400 bg-neutral-400 dark:bg-neutral-400"></div>
    </div>
  );
}
