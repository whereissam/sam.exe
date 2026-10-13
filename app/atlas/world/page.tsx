'use client';
import { lazy, Suspense, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
const PhotoAtlas = lazy(() => import('@/components/stories/PhotoAtlas'));
function subscribe(callback: () => void) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
export default function WalkableAtlasPage() {
  const router = useRouter();
  const reduced = useSyncExternalStore(subscribe, () => matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
  return <main style={{ height: '100dvh', width: '100%', overflow: 'hidden' }}>
    <Suspense fallback={<p>Opening the memory atlas…</p>}><PhotoAtlas reduced={reduced} onExit={() => router.push('/')} /></Suspense>
  </main>;
}
