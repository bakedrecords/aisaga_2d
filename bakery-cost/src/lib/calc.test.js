import { describe, it, expect } from 'vitest'
import { unitCost, calcDough, calcFilling, calcProduct, yen } from './calc.js'

describe('unitCost', () => {
  it('kg を 円/g に正規化する', () => {
    expect(unitCost({ purchasePrice: 280, purchaseAmount: 1, unit: 'kg' })).toBeCloseTo(0.28)
  })
  it('g はそのまま 円/g', () => {
    expect(unitCost({ purchasePrice: 100, purchaseAmount: 200, unit: 'g' })).toBeCloseTo(0.5)
  })
  it('個建ては 円/個', () => {
    expect(unitCost({ purchasePrice: 300, purchaseAmount: 10, unit: 'piece' })).toBe(30)
  })
  it('数量0は0', () => {
    expect(unitCost({ purchasePrice: 300, purchaseAmount: 0, unit: 'g' })).toBe(0)
  })
  it('null / 数量null は0（落とさない）', () => {
    expect(unitCost(null)).toBe(0)
    expect(unitCost({ purchasePrice: 100, purchaseAmount: null, unit: 'g' })).toBe(0)
  })
})

describe('calcDough', () => {
  const ingredientMap = {
    flour: { id: 'flour', name: '強力粉', purchasePrice: 280, purchaseAmount: 1, unit: 'kg' }, // 0.28/g
    water: { id: 'water', name: '水', purchasePrice: 0, purchaseAmount: 1, unit: 'l' }, // 0/ml
    salt: { id: 'salt', name: '塩', purchasePrice: 100, purchaseAmount: 1, unit: 'kg' }, // 0.1/g
  }
  it('粉100 / 水65 / 塩2 を集計する', () => {
    const dough = {
      items: [
        { ingredientId: 'flour', percent: 100 },
        { ingredientId: 'water', percent: 65 },
        { ingredientId: 'salt', percent: 2 },
      ],
    }
    const r = calcDough(dough, ingredientMap)
    expect(r.totalPercent).toBe(167)
    expect(r.totalWeight).toBeCloseTo(1670) // 1000 + 650 + 20
    expect(r.totalCost).toBeCloseTo(282) // 1000*0.28 + 0 + 20*0.1
    expect(r.costPerGram).toBeCloseTo(282 / 1670)
  })
  it('空配列で 0', () => {
    const r = calcDough({ items: [] }, ingredientMap)
    expect(r.totalCost).toBe(0)
    expect(r.costPerGram).toBe(0)
  })
})

describe('calcFilling', () => {
  const ingredientMap = {
    bean: { id: 'bean', name: 'あんこ', purchasePrice: 500, purchaseAmount: 1000, unit: 'g' }, // 0.5/g
  }
  it('出来上がり量 未指定なら材料合計を採用', () => {
    const f = { yieldAmount: 0, items: [{ ingredientId: 'bean', amount: 600 }] }
    const r = calcFilling(f, ingredientMap)
    expect(r.totalAmount).toBe(600)
    expect(r.totalCost).toBeCloseTo(300)
    expect(r.yieldAmount).toBe(600)
    expect(r.costPerGram).toBeCloseTo(0.5)
  })
  it('出来上がり量 指定（煮詰めロス）で 1g 原価が上がる', () => {
    const f = { yieldAmount: 400, items: [{ ingredientId: 'bean', amount: 600 }] }
    const r = calcFilling(f, ingredientMap)
    expect(r.totalCost).toBeCloseTo(300)
    expect(r.yieldAmount).toBe(400)
    expect(r.costPerGram).toBeCloseTo(0.75) // 300 / 400
  })
})

describe('calcProduct', () => {
  const ingredientMap = {
    sesame: { id: 'sesame', name: 'ごま', purchasePrice: 200, purchaseAmount: 100, unit: 'g' }, // 2/g
  }
  const doughCostMap = { d1: 0.3 } // 0.3 円/g
  const fillingCostMap = { f1: 0.5 } // 0.5 円/g
  it('生地 + フィリング + 直接材料の合算と原価率', () => {
    const p = {
      sellingPrice: 200,
      components: [
        { type: 'dough', refId: 'd1', amount: 100 }, // 30
        { type: 'filling', refId: 'f1', amount: 50 }, // 25
        { type: 'ingredient', refId: 'sesame', amount: 5 }, // 10
      ],
    }
    const r = calcProduct(p, { ingredientMap, doughCostMap, fillingCostMap })
    expect(r.totalCost).toBeCloseTo(65)
    expect(r.costRate).toBeCloseTo(32.5)
    expect(r.grossProfit).toBeCloseTo(135)
    expect(r.grossMargin).toBeCloseTo(67.5)
  })
  it('売値0なら原価率0', () => {
    const p = { sellingPrice: 0, components: [{ type: 'dough', refId: 'd1', amount: 100 }] }
    const r = calcProduct(p, { ingredientMap, doughCostMap, fillingCostMap })
    expect(r.costRate).toBe(0)
    expect(r.grossMargin).toBe(0)
  })
  it('参照先が見つからない構成は原価0として扱う（落とさない）', () => {
    const p = { sellingPrice: 100, components: [{ type: 'dough', refId: 'missing', amount: 100 }] }
    const r = calcProduct(p, { ingredientMap, doughCostMap, fillingCostMap })
    expect(r.totalCost).toBe(0)
  })
})

describe('yen', () => {
  it('NaN / 未定義は 0', () => {
    expect(yen(undefined, 0)).toBe('0')
    expect(yen(NaN, 0)).toBe('0')
  })
  it('桁数指定で丸める', () => {
    expect(yen(1234.5, 0)).toBe('1,235')
  })
})
