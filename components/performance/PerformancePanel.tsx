'use client';
import { useEffect, useState } from 'react';

type Metrics = Record<string, unknown>;
export default function PerformancePanel() {
  const [enabled, setEnabled] = useState(false);
  const [report, setReport] = useState('');
  const [metrics, setMetrics] = useState<Metrics>({});
  useEffect(() => {
    if (new URLSearchParams(location.search).get('perf') !== '1') return;
    setEnabled(true);
    const measured: Metrics = {};
    const observers: PerformanceObserver[] = [];
    let cls = 0,
      windowScore = 0,
      firstShift = 0,
      lastShift = 0;
    const observe = (
      type: string,
      handler: (entries: PerformanceEntry[]) => void,
    ) => {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
      const observer = new PerformanceObserver((list) =>
        handler(list.getEntries()),
      );
      observer.observe({ type, buffered: true });
      observers.push(observer);
    };
    observe('paint', (entries) => {
      for (const entry of entries)
        measured[entry.name] = Math.round(entry.startTime);
    });
    observe('largest-contentful-paint', (entries) => {
      measured.lcpMs = Math.round(entries.at(-1)!.startTime);
    });
    observe('layout-shift', (entries) => {
      for (const entry of entries) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (shift.hadRecentInput) continue;
        if (
          entry.startTime - lastShift > 1000 ||
          entry.startTime - firstShift > 5000
        ) {
          windowScore = 0;
          firstShift = entry.startTime;
        }
        windowScore += shift.value;
        lastShift = entry.startTime;
        cls = Math.max(cls, windowScore);
      }
      measured.cls = Number(cls.toFixed(4));
    });
    observe('longtask', (entries) => {
      measured.longTasks = Number(measured.longTasks ?? 0) + entries.length;
      measured.maxLongTaskMs = Math.round(
        Math.max(
          Number(measured.maxLongTaskMs ?? 0),
          ...entries.map((e) => e.duration),
        ),
      );
    });
    const frames = (event: Event) => {
      measured.renderSample = (event as CustomEvent).detail;
    };
    window.addEventListener('sam-render-sample', frames);
    const refresh = () => {
      const resources = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];
      const entry =
        performance.getEntriesByName('sam-enter-3d').at(-1)?.startTime ??
        Infinity;
      const initial = resources.filter((r) => r.startTime < entry);
      const models = resources.filter((r) => r.name.endsWith('.glb'));
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      setMetrics({
        ...measured,
        viewport: `${innerWidth}×${innerHeight}`,
        userAgent: navigator.userAgent,
        devicePixelRatio,
        ttfbMs: navigation
          ? Math.round(navigation.responseStart - navigation.startTime)
          : null,
        initialResourceCount: initial.length,
        initialTransferredKiB: Number(
          (initial.reduce((n, r) => n + r.transferSize, 0) / 1024).toFixed(1),
        ),
        initial3dRequests: initial.filter((r) => /World-|\.glb/.test(r.name))
          .length,
        worldChunk: resources
          .filter((r) => /World-/.test(r.name))
          .map((r) => ({
            durationMs: Math.round(r.duration),
            transferredKiB: Number((r.transferSize / 1024).toFixed(1)),
          })),
        modelsLoaded: models.length,
        modelTransferredKiB: Number(
          (models.reduce((n, r) => n + r.transferSize, 0) / 1024).toFixed(1),
        ),
        enterToLastModelMs:
          models.length && Number.isFinite(entry)
            ? Math.round(Math.max(...models.map((r) => r.responseEnd)) - entry)
            : null,
        overflowPx: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        canvas: !!document.querySelector('canvas'),
        resourceFailures: resources
          .filter((r) => r.responseStatus >= 400)
          .map((r) => ({ url: r.name, status: r.responseStatus })),
      });
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => {
      clearInterval(timer);
      observers.forEach((o) => o.disconnect());
      window.removeEventListener('sam-render-sample', frames);
    };
  }, []);
  if (!enabled) return null;
  return (
    <details className="perf-panel">
      <summary>Performance test · local readings</summary>
      <p>
        Local lab sample; no CPU/network throttling. A desktop viewport is not a
        physical phone. Cached transfers may report 0. LCP is a load sample, not
        a field score.
      </p>
      <button
        disabled={!metrics.canvas || Number(metrics.modelsLoaded) < 6}
        onClick={() => window.dispatchEvent(new Event('sam-benchmark-start'))}
      >
        Run 8-second 3D render sample
      </button>
      <p>
        Enter 3D first. Keep this tab visible; the camera orbits during the
        sample.
      </p>
      <button onClick={() => setReport(JSON.stringify(metrics, null, 2))}>
        Prepare report to copy
      </button>
      {report && (
        <textarea
          aria-label="Report snapshot to copy"
          readOnly
          value={report}
          rows={8}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
      <pre data-testid="performance-report">
        {JSON.stringify(metrics, null, 2)}
      </pre>
    </details>
  );
}
