'use client';
import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Mesh } from 'three';
import manifest from './model-manifest.json';
import type { District } from './districts';

// Only successful exports enter this manifest. An empty catalog requests no GLBs.
const models: Partial<Record<District['id'], string>> = manifest;
export class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function Asset({ url }: { url: string }) {
  // These texture-free exports don't need external decoder downloads.
  const { scene } = useGLTF(url, false, false);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  // useGLTF owns the cached geometries/materials shared by this clone.
  return <primitive object={object} dispose={null} />;
}
export function DistrictModel({
  id,
  children,
}: {
  id: District['id'];
  children: ReactNode;
}) {
  const url = models[id];
  if (!url) return children;
  return (
    <ModelBoundary key={url} fallback={children}>
      <Suspense fallback={children}>
        <Asset url={url} />
      </Suspense>
    </ModelBoundary>
  );
}
