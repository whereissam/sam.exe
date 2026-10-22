import type { ReactNode } from 'react';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function ElsewhereLayout({ children }: { children: ReactNode }) {
  return children;
}
