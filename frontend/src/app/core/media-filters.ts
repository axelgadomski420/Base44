/** 0.5.0: filtry mediów jak TikTok — CSS filter nakładany w kreatorze i w feedzie. */
export interface PurreFilter { id: string; name: string; css: string; }

export const PURRE_FILTERS: PurreFilter[] = [
  { id: 'NONE', name: 'bez filtra', css: '' },
  { id: 'AURORA', name: '🌌 Aurora', css: 'saturate(1.4) hue-rotate(10deg) contrast(1.05)' },
  { id: 'SEPIA', name: '☕ Sepia', css: 'sepia(0.6)' },
  { id: 'MONO', name: '🖤 Mono', css: 'grayscale(1) contrast(1.1)' },
  { id: 'COOL', name: '❄️ Chłodny', css: 'hue-rotate(-15deg) saturate(1.2) brightness(1.02)' },
  { id: 'WARM', name: '🔥 Ciepły', css: 'sepia(0.25) saturate(1.35)' },
  { id: 'VIVID', name: '✨ Żywy', css: 'saturate(1.8) contrast(1.1)' },
  { id: 'DREAM', name: '💭 Dream', css: 'brightness(1.08) saturate(1.2) blur(0.4px)' }
];

export function filterCss(id: string | null | undefined): string {
  return PURRE_FILTERS.find(f => f.id === (id || 'NONE'))?.css ?? '';
}
