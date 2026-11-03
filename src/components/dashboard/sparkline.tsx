export function Sparkline({
  points = [18, 24, 20, 28, 26, 34, 31, 38, 35, 42, 40, 47],
  className,
}: {
  points?: number[];
  className?: string;
}) {
  const width = 140;
  const height = 44;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points
    .map((point, index) => `${index * step},${height - ((point - min) / range) * (height - 6) - 3}`)
    .join(" ");
  const area = `0,${height} ${coords} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      role="img"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nv-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--nv-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={coords}
        fill="none"
        stroke="var(--nv-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
