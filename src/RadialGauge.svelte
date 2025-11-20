<script>
  export let registerNumber = 0;
  export let value = 0;
  export let size = 120;
  export let strokeWidth = 10;

  $: percentage = (value / 100) * 100;
  $: dashArray = 2 * Math.PI * (size / 2 - strokeWidth / 2);
  $: dashOffset = dashArray * (1 - percentage / 100);

  $: colorVal = percentage < 33 ? '#10b981' : percentage < 66 ? '#f59e0b' : '#ef4444';
</script>

<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
  <circle
    cx={size / 2}
    cy={size / 2}
    r={size / 2 - strokeWidth / 2}
    fill="none"
    stroke="#e5e7eb"
    stroke-width={strokeWidth}
  />
  <circle
    cx={size / 2}
    cy={size / 2}
    r={size / 2 - strokeWidth / 2}
    fill="none"
    stroke={colorVal}
    stroke-width={strokeWidth}
    stroke-dasharray={dashArray}
    stroke-dashoffset={dashOffset}
    transform={`rotate(-90 ${size / 2} ${size / 2})`}
  />
  <text x="50%" y="48%" text-anchor="middle" dy=".3em" font-size="18" font-weight="700">
    {value}
  </text>
  <text x="50%" y="63%" text-anchor="middle" font-size="11" fill="#6b7280">
    #{registerNumber}
  </text>
</svg>

<style>
  svg {
    display: block;
    margin: 0 auto;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }
</style>
