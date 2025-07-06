// frontend/src/components/ui/toaster.tsx
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      duration={3000}
    />
  );
}
