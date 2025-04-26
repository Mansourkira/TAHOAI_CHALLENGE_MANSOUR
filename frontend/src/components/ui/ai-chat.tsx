import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  CircleUserRound,
  FileUp,
  ImageIcon,
  MonitorIcon,
  Paperclip,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      // Temporarily shrink to get the right scrollHeight
      textarea.style.height = `${minHeight}px`;

      // Calculate new height
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    // Set initial height
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  // Adjust height on window resize
  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

export function VercelV0Chat() {
  const [value, setValue] = useState("");
  const [isClient, setIsClient] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  // Ensure we're running on client-side before doing any DOM manipulations
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        setValue("");
        adjustHeight(true);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-black dark:text-white text-center mb-8">
        How can Taho AI assist you today?
      </h1>

      <div className="w-full">
        <div className="relative bg-neutral-200 dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-800 overflow-hidden shadow-lg">
          <div className="overflow-y-auto">
            {isClient && (
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask Taho AI a question..."
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-neutral-800 dark:text-white text-sm",
                  "focus:outline-none",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "placeholder:text-neutral-500 placeholder:text-sm",
                  "min-h-[60px]"
                )}
                style={{
                  overflow: "hidden",
                }}
              />
            )}
            {!isClient && (
              <div className="w-full px-4 py-3 min-h-[60px] text-neutral-800 dark:text-white text-sm">
                Loading Taho AI...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 border-t border-neutral-300 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="group p-2 hover:bg-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
              >
                <Paperclip className="w-4 h-4 text-neutral-700 dark:text-white" />
                <span className="text-xs text-neutral-600 dark:text-zinc-400 hidden group-hover:inline transition-opacity">
                  Attach
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded-lg text-sm text-neutral-600 dark:text-zinc-400 transition-colors border border-dashed border-neutral-400 dark:border-zinc-700 hover:border-neutral-500 dark:hover:border-zinc-600 hover:bg-neutral-300 dark:hover:bg-zinc-800 flex items-center justify-between gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Project
              </button>
              <button
                type="button"
                className={cn(
                  "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-neutral-400 dark:border-zinc-700 hover:border-neutral-500 dark:hover:border-zinc-600 hover:bg-neutral-300 dark:hover:bg-zinc-800 flex items-center justify-between gap-1",
                  value.trim() && isClient
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-neutral-600 dark:text-zinc-400"
                )}
              >
                <ArrowUpIcon
                  className={cn(
                    "w-4 h-4",
                    value.trim() && isClient
                      ? "text-white dark:text-black"
                      : "text-neutral-600 dark:text-zinc-400"
                  )}
                />
                <span className="sr-only">Send</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          <ActionButton
            icon={<ImageIcon className="w-4 h-4" />}
            label="Upload Images"
          />
          <ActionButton
            icon={<FileUp className="w-4 h-4" />}
            label="Upload Document"
          />
          <ActionButton
            icon={<MonitorIcon className="w-4 h-4" />}
            label="Website Analysis"
          />
          <ActionButton
            icon={<CircleUserRound className="w-4 h-4" />}
            label="Personal Assistant"
          />
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
}

function ActionButton({ icon, label }: ActionButtonProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 rounded-full border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors text-xs"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
