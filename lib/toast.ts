export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('console911-toast', {
        detail: { message, type, duration }
      })
    );
  }
}
