# Mobile-layout performance check — 2026-09-06

## Environment and limits

Production build served by local Wrangler on localhost:4173. Chrome 152 on macOS; browser viewport overridden to 390×844, DPR 1. No connected physical phone was available. No CPU or network throttling API was exposed. Browser cache was not cleared: these are local lab observations, not cold-load mobile benchmarks or field Core Web Vitals.

The web-perf skill's Chrome DevTools MCP route was unavailable. Its requirement to stop that workflow was respected; measurements instead use an opt-in in-page PerformanceObserver panel and the connected browser's UI. No DevTools trace or Lighthouse score is claimed.

## Observed first sample

- FCP and LCP load sample: 88 ms, local partially cached request.
- TTFB: 46 ms.
- CLS session-window maximum observed: 0.021.
- Before entering 3D: 0 World-chunk / GLB requests.
- Initial resource transfer reported: 86.1 KiB (excludes HTML; cached or cross-origin resources may report zero).
- After entering: World chunk 259 KiB transferred; six GLBs 294.2 KiB transferred.
- Click to last GLB response: 449 ms. This measures download completion, not final painted readiness.
- Resource Timing reported no HTTP failures for the observed resources.
- Canvas drawing buffer: 390×370.
- Active scene: 152 draw calls, 12,998 triangles (includes island and environment, not just the exported models).
- Idle rendering: 0 scene frames in the sampled idle second.
- Horizontal overflow: 0 px.
- Long tasks during load/entry: 2, longest 327 ms. This is a main-thread stall observed on desktop; lower-powered devices require measurement before smoothness can be claimed.

## Reproduce on a phone

Open the production website with `?perf=1`. Expand “Performance test · local readings”, enter 3D, and press “Run 8-second 3D render sample”. Keep the tab visible until `sampling` returns to false. Copy the JSON together with the phone model, browser version, and Wi-Fi/cellular connection. The panel sends nothing to a server and stores no personal data.

The test runs an 8-second camera orbit and records rendered frames, average frame rate, p95 frame interval, draw calls, and buffer dimensions. FPS describes this particular scene and device under this workload. Test mode itself adds a small one-second reporting overhead. Repeated runs may use cached resources.

The phone cannot use the Mac's localhost URL directly. For same-network testing, bind the production server to the Mac's LAN address; for Android USB debugging, use DevTools port forwarding. A reachable URL or this forwarding must be set up before a phone run.

## Final render-sample verification

On the final build, after all models loaded: 956 rendered frames over the eight-second orbit, average 119.3 FPS, p95 frame interval 9.3 ms. The same Mac/Chrome mobile-viewport environment applies; this does not predict phone frame rate. After the sample ended, the scene returned to 0 frames in the sampled idle second. Final load sample: FCP 200 ms, LCP 368 ms, CLS 0.003, click-to-last-model response 386 ms, no reported resource HTTP failures. Photography chapter opens from the mobile navigation and exposes its bottom-sheet content.
