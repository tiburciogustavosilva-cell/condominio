import type { ComponentProps } from 'react';
import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  const { tema } = useTheme();
  return (
    <Sonner
      theme={tema}
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md',
          description: 'group-[.toast]:text-muted-foreground'
        }
      }}
      {...props}
    />
  );
}
