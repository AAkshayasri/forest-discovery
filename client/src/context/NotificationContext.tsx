import React, { createContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface NotificationContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

export const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-secondary shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-tertiary shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-secondary/35 bg-secondary-container/20';
      case 'error':
        return 'border-error/35 bg-error-container/20';
      case 'warning':
        return 'border-tertiary/35 bg-tertiary-container/30';
      case 'info':
      default:
        return 'border-primary/35 bg-primary-container/20';
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toasts Anchor */}
      <div className="fixed top-24 right-6 z-[99] flex flex-col gap-3 w-80 pointer-events-none select-none font-body-md">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md shadow-xl ${getBorderColor(
                toast.type
              )}`}
            >
              {getIcon(toast.type)}
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-on-surface leading-tight font-label-md">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
