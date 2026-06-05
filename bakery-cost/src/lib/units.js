// 単位定義・換算（仕様 §5.1）
// 各単位を「最小単位（g / ml / 個）」へ換算する係数 toBase を持つ。

export const UNITS = {
  g:     { label: 'g',  kind: 'weight', base: 'g', toBase: 1 },
  kg:    { label: 'kg', kind: 'weight', base: 'g', toBase: 1000 },
  ml:    { label: 'ml', kind: 'volume', base: 'ml', toBase: 1 },
  l:     { label: 'L',  kind: 'volume', base: 'ml', toBase: 1000 },
  piece: { label: '個', kind: 'count',  base: '個', toBase: 1 },
}

// select 用の表示順
export const UNIT_OPTIONS = ['g', 'kg', 'ml', 'l', 'piece']

/** unit の最小単位ラベル（g / ml / 個）。未知の単位は 'g'。 */
export function baseUnitLabel(unit) {
  return UNITS[unit]?.base ?? 'g'
}

/** unit を最小単位へ換算する係数。未知の単位は 1。 */
export function toBase(unit) {
  return UNITS[unit]?.toBase ?? 1
}
