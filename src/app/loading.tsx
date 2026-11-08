export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__orb" aria-hidden="true" />
      <span>Opening the next chapter…</span>
    </div>
  );
}
