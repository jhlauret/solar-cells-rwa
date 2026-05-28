import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: '"Plus Jakarta Sans Variable", system-ui, sans-serif',
          fontSize:   '14px',
        },
        duration: 4_000,
      }}
    />
  );
}
