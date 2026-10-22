export default function RoomLoading({
  loaded,
  total,
}: {
  loaded?: number;
  total?: number;
}) {
  const known = total !== undefined && total > 0;
  return (
    <div className="ai-loading-screen" aria-live="polite">
      <span className="ai-kicker">AI OBSERVATORY</span>
      <h2>Opening the workshop</h2>
      <p>
        {known
          ? `Loading room assets · ${loaded ?? 0} / ${total}`
          : 'Preparing the 3D engine…'}
      </p>
      <progress
        aria-label="Room loading"
        max={known ? total : undefined}
        value={known ? loaded : undefined}
      />
      <small>
        Give the explorer a destination. Change its route with crates.
      </small>
    </div>
  );
}
