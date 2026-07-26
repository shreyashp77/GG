export function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="GG Cricket Manager">
      <span className="brand-ball" />
      {!compact && (
        <span className="brand-type">
          <strong>GG</strong>
          <small>Cricket Manager</small>
        </span>
      )}
    </div>
  );
}
