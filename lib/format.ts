export function formatCompactNumber(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  const units = [
    { value: 1_000_000_000_000, suffix: "T" },
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ];

  const unit = units.find((candidate) => abs >= candidate.value);
  if (!unit) return `${sign}${Math.round(abs).toLocaleString("en-US")}`;

  const scaled = abs / unit.value;
  const compact = Number(scaled.toFixed(2)).toString();
  return `${sign}${compact}${unit.suffix}`;
}

export function formatCompactCurrency(valueUsd: number | null | undefined) {
  return `$${formatCompactNumber(valueUsd)}`;
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
