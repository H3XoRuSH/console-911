'use client';

import React, { useState, useEffect } from 'react';
import { Toast, ToastType } from '@/lib/toast';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 3000;
    const exitDelay = Math.max(0, duration - 300);

    // Fade in shortly after mounting to trigger transition
    const enterTimer = setTimeout(() => {
      setActive(true);
    }, 50);

    // Trigger fade out before duration ends
    const exitTimer = setTimeout(() => {
      setActive(false);
    }, exitDelay);

    // Call onRemove only after duration completes
    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const getStyleClass = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500 text-emerald-400 bg-black/95 crt-glow-green shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      case 'error':
        return 'border-red-500 text-red-500 bg-black/95 crt-glow-red shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'warning':
        return 'border-amber-500 text-amber-400 bg-black/95 crt-glow-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'info':
      default:
        return 'border-cyan-500 text-cyan-400 bg-black/95 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
    }
  };

  const getPrefix = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '[ OK ]';
      case 'error':
        return '[ERR!]';
      case 'warning':
        return '[WARN]';
      case 'info':
      default:
        return '[INFO]';
    }
  };

  return (
    <div
      className={`pointer-events-auto border px-4 py-3 rounded font-mono text-xs select-none flex items-center gap-3 transition-all duration-300 ease-in-out transform ${
        active 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 -translate-y-4 scale-95'
      } ${getStyleClass(toast.type)} relative overflow-hidden`}
    >
      <span className="font-bold opacity-80 shrink-0">{getPrefix(toast.type)}</span>
      <span className="uppercase tracking-wider pb-1">{toast.message}</span>
      <div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-80"
        style={{ animation: `shrink-width ${toast.duration || 3000}ms linear forwards` }}
      />
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{
        message: string;
        type: ToastType;
        duration?: number;
      }>;

      const { message, type, duration = 3000 } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);

      const newToast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, newToast]);
    };

    window.addEventListener('console911-toast', handleToast);
    return () => {
      window.removeEventListener('console911-toast', handleToast);
    };
  }, []);

  const handleRemove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 pointer-events-none items-center w-full max-w-md px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
      <style>{`
        @keyframes shrink-width {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};
