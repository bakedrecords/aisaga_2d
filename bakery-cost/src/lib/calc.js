// 原価計算（仕様 §5）。すべて副作用のない純粋関数。UI から完全に分離する。
import { toBase } from './units.js'

/** 数値化ヘルパ。NaN / undefined / null は 0 として扱う。 */
function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * §5.1 単位の正規化。
 * 仕入れ単位に関わらず「最小単位（g / ml / 個）あたりの円」を返す。
 * baseAmount <= 0 のときは 0。
 */
export function unitCost(ingredient) {
  if (!ingredient) return 0
  const price = num(ingredient.purchasePrice)
  const amount = num(ingredient.purchaseAmount)
  const baseAmount = amount * toBase(ingredient.unit)
  if (baseAmount <= 0) return 0
  return price / baseAmount
}

/**
 * §5.2 生地（ベーカーズ%）。
 * 粉の総量を100%とした重量比。基準粉量に依存せず1gあたり原価が決まるため、
 * 内部的に粉1000gを基準に計算する。
 * @returns {{ totalPercent:number, totalWeight:number, totalCost:number, costPerGram:number, breakdown:Array }}
 */
export function calcDough(dough, ingredientMap = {}) {
  const items = dough?.items ?? []
  let totalWeight = 0
  let totalCost = 0
  let totalPercent = 0
  const breakdown = items.map((it) => {
    const ing = ingredientMap[it.ingredientId]
    const percent = num(it.percent)
    const weight = 1000 * (percent / 100) // 粉1000g基準
    const cost = weight * unitCost(ing)
    totalWeight += weight
    totalCost += cost
    totalPercent += percent
    return {
      ingredientId: it.ingredientId,
      name: ing?.name ?? '(不明な材料)',
      percent,
      weight,
      cost,
    }
  })
  const costPerGram = totalWeight > 0 ? totalCost / totalWeight : 0
  return { totalPercent, totalWeight, totalCost, costPerGram, breakdown }
}

/**
 * §5.3 フィリング。
 * yieldAmount を明示すると煮詰めロスを反映できる（0 のときは材料合計重量を採用）。
 * @returns {{ totalAmount:number, totalCost:number, yieldAmount:number, costPerGram:number, breakdown:Array }}
 */
export function calcFilling(filling, ingredientMap = {}) {
  const items = filling?.items ?? []
  let totalAmount = 0
  let totalCost = 0
  const breakdown = items.map((it) => {
    const ing = ingredientMap[it.ingredientId]
    const amount = num(it.amount)
    const cost = amount * unitCost(ing)
    totalAmount += amount
    totalCost += cost
    return {
      ingredientId: it.ingredientId,
      name: ing?.name ?? '(不明な材料)',
      amount,
      cost,
    }
  })
  const y = num(filling?.yieldAmount)
  const yieldAmount = y > 0 ? y : totalAmount
  const costPerGram = yieldAmount > 0 ? totalCost / yieldAmount : 0
  return { totalAmount, totalCost, yieldAmount, costPerGram, breakdown }
}

/**
 * §5.4 商品。
 * doughCostMap[id] = 生地1gあたり原価、fillingCostMap[id] = フィリング1gあたり原価
 * （呼び出し側で calcDough / calcFilling から事前算出して渡す）。
 * @returns {{ totalCost:number, sellingPrice:number, costRate:number, grossProfit:number, grossMargin:number, breakdown:Array }}
 */
export function calcProduct(product, maps = {}) {
  const { ingredientMap = {}, doughCostMap = {}, fillingCostMap = {} } = maps
  const components = product?.components ?? []
  let totalCost = 0
  const breakdown = components.map((c) => {
    const amount = num(c.amount)
    let perUnit = 0
    if (c.type === 'dough') {
      perUnit = num(doughCostMap[c.refId]) // 円/g
    } else if (c.type === 'filling') {
      perUnit = num(fillingCostMap[c.refId]) // 円/g
    } else if (c.type === 'ingredient') {
      perUnit = unitCost(ingredientMap[c.refId]) // 円/最小単位
    }
    const cost = amount * perUnit
    totalCost += cost
    return { type: c.type, refId: c.refId, amount, perUnit, cost }
  })

  // ── 将来拡張の差し込み位置（§5.4 / §12）──────────────────────────
  // 歩留まり（ロス率）: totalCost = totalCost / (1 - lossRate)
  // 包材費・諸経費   : totalCost += packagingCost
  // ───────────────────────────────────────────────────────────────

  const sellingPrice = num(product?.sellingPrice)
  const costRate = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0
  const grossProfit = sellingPrice - totalCost
  const grossMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0
  return { totalCost, sellingPrice, costRate, grossProfit, grossMargin, breakdown }
}

/** §5.5 表示ヘルパ。NaN / 未定義は 0 扱い。 */
export function yen(value, digits = 1) {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  return safe.toLocaleString('ja-JP', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
