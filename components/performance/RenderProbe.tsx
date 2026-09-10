'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
export default function RenderProbe({ sampling }: { sampling: boolean }) {
  const { gl } = useThree();
  const count = useRef(0),
    start = useRef(0),
    last = useRef(0),
    intervals = useRef<number[]>([]);
  const frames = useRef(0);
  useEffect(() => {
    if (!sampling) return;
    count.current = 0;
    start.current = 0;
    last.current = 0;
    intervals.current = [];
  }, [sampling]);
  useFrame(() => {
    frames.current++;
    if (!sampling) return;
    const now = performance.now();
    if (!start.current) start.current = now;
    if (last.current) intervals.current.push(now - last.current);
    last.current = now;
    count.current++;
  });
  useEffect(() => {
    if (new URLSearchParams(location.search).get('perf') !== '1') return;
    const timer = setInterval(() => {
      const sorted = [...intervals.current].sort((a, b) => a - b);
      window.dispatchEvent(
        new CustomEvent('sam-render-sample', {
          detail: {
            sampling,
            framesInLastSecond: frames.current,
            sampleFrames: count.current,
            averageFps: sorted.length
              ? Number(
                  (
                    (1000 * sorted.length) /
                    sorted.reduce((a, b) => a + b, 0)
                  ).toFixed(1),
                )
              : null,
            p95FrameMs: sorted.length
              ? Number(
                  sorted[
                    Math.min(
                      sorted.length - 1,
                      Math.floor(sorted.length * 0.95),
                    )
                  ].toFixed(1),
                )
              : null,
            drawCalls: gl.info.render.calls,
            triangles: gl.info.render.triangles,
            bufferWidth: gl.domElement.width,
            bufferHeight: gl.domElement.height,
          },
        }),
      );
      frames.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, [gl, sampling]);
  return null;
}
