import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Room — SAM.EXE',
  description: 'An interactive miniature room for unfinished ideas.',
};

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
