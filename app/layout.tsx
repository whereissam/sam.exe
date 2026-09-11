import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SAM.EXE — A small world of big curiosities',
  description:
    'An interactive 3D playground exploring frontend, blockchain, AI, and robotics.',
  // public/ files are not auto-linked; only app/icon.* and app/favicon.ico are.
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'SAM.EXE',
    description: 'A small world of big curiosities.',
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
