export const syncExample = `// Contextual TypeScript: audio is already scheduled, primed and running.
// anchor maps the SAME audio sample to context seconds and composition seconds.
// Rebuild the anchor and replace queued frames on seek/resume/rate changes.
type Anchor = { contextSeconds: number; compositionSeconds: number; rate: number };
export function startVideoClock(
  audio: AudioContext, canvas: CanvasRenderingContext2D,
  anchor: Anchor, queue: VideoFrame[] // owned, sorted by presentation timestamp
): () => void {
  let raf = 0;
  let stopped = false;
  const render = () => {
    if (stopped) return;
    if (audio.state === 'running' && typeof audio.getOutputTimestamp === 'function') {
      const ts = audio.getOutputTimestamp();
      const nowMs = performance.now();
      // A startup/suspended/unavailable timestamp is not a usable output clock.
      if (typeof ts.contextTime === 'number' && typeof ts.performanceTime === 'number' &&
          ts.contextTime > 0 && ts.performanceTime > 0 &&
          nowMs >= ts.performanceTime && nowMs - ts.performanceTime < 250) {
        const outputSeconds = ts.contextTime + (nowMs - ts.performanceTime) / 1000;
        const compositionSeconds = anchor.compositionSeconds +
          (outputSeconds - anchor.contextSeconds) * anchor.rate;
        // No extra outputLatency or baseLatency subtraction here.
        // PTS in WebCodecs microseconds -> composition seconds (pre-mapped by app).
        let candidate: VideoFrame | undefined;
        while (queue.length && queue[0].timestamp / 1e6 <= compositionSeconds) {
          const frame = queue.shift()!;
          const pts = frame.timestamp / 1e6;
          // This sample's app policy: discard >60 ms late; keep newest due frame.
          if (compositionSeconds - pts > 0.060) frame.close();
          else { candidate?.close(); candidate = frame; }
        }
        if (candidate) {
          try { canvas.drawImage(candidate, 0, 0); }
          finally { candidate.close(); }
        }
        // A future frame's approximate deadline on the performance timeline:
        if (queue.length) {
          const pts = queue[0].timestamp / 1e6;
          const targetContext = anchor.contextSeconds +
            (pts - anchor.compositionSeconds) / anchor.rate;
          const deadlineMs = ts.performanceTime +
            (targetContext - ts.contextTime) * 1000;
          void deadlineMs; // for diagnostics; rAF is not an exact display deadline
        }
      }
    }
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);
  return () => { stopped = true; cancelAnimationFrame(raf); queue.splice(0).forEach(f => f.close()); };
}`
