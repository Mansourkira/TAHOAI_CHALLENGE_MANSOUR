import { cn } from "@/lib/utils";
import { AlertCircle, Check, Info, X } from "lucide-react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Clear all toasts when component unmounts
  useEffect(() => {
    return () => {
      setToasts([]);
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, hideToast, clearToasts }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center justify-between p-3 shadow-md rounded-md text-sm min-w-[300px] opacity-90",
            toast.type === "success" &&
              "bg-green-50 text-green-800 dark:bg-green-900/90 dark:text-green-100",
            toast.type === "error" &&
              "bg-red-50 text-red-800 dark:bg-red-900/90 dark:text-red-100",
            toast.type === "info" &&
              "bg-blue-50 text-blue-800 dark:bg-blue-900/90 dark:text-blue-100"
          )}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" && (
              <Check size={16} className="text-green-500 dark:text-green-400" />
            )}
            {toast.type === "error" && (
              <AlertCircle
                size={16}
                className="text-red-500 dark:text-red-400"
              />
            )}
            {toast.type === "info" && (
              <Info size={16} className="text-blue-500 dark:text-blue-400" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => onClose(toast.id)}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
