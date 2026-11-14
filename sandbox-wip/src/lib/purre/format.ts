export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return "przed chwilą";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} godz.`;
  if (s < 86400 * 14) return `${Math.floor(s / 86400)} dni`;
  return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export function pln(n: number): string {
  if (!n) return "adopcja";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function coins(n: number): string {
  return `${new Intl.NumberFormat("pl-PL").format(n)} PURRE`;
}
