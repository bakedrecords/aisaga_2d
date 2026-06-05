import { describe, it, expect } from 'vitest'
import {
  buildExport,
  parseImport,
  normalize,
  defaultFilename,
  SCHEMA_VERSION,
} from './io.js'

const sample = {
  ingredients: [
    { id: 'a', name: '強力粉', purchasePrice: 280, purchaseAmount: 1, unit: 'kg', note: '' },
  ],
  doughs: [
    { id: 'd', name: '食パン生地', note: '', items: [{ id: 'di', ingredientId: 'a', percent: 100 }] },
  ],
  fillings: [{ id: 'f', name: 'あん', note: '', yieldAmount: 0, items: [] }],
  products: [{ id: 'p', name: 'あんパン', note: '', sellingPrice: 150, components: [] }],
}

describe('buildExport', () => {
  it('app / schemaVersion / exportedAt / data を含む', () => {
    const e = buildExport(sample)
    expect(e.app).toBe('bakery-cost')
    expect(e.schemaVersion).toBe(SCHEMA_VERSION)
    expect(typeof e.exportedAt).toBe('string')
    expect(e.data).toEqual(sample)
  })
})

describe('parseImport（ラウンドトリップ）', () => {
  it('buildExport → stringify → parseImport で元データに一致する', () => {
    const text = JSON.stringify(buildExport(sample))
    const r = parseImport(text)
    expect(r.ok).toBe(true)
    expect(r.data).toEqual(sample)
  })
})

describe('parseImport（異常系・後方互換）', () => {
  it('不正なJSON文字列で例外を投げず ok:false', () => {
    const r = parseImport('{壊れた json')
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
  it('object でない値は ok:false', () => {
    expect(parseImport('123').ok).toBe(false)
    expect(parseImport('null').ok).toBe(false)
    expect(parseImport('"text"').ok).toBe(false)
  })
  it('data キーのない素の AppData 形式も取り込める（後方互換）', () => {
    const r = parseImport(JSON.stringify(sample))
    expect(r.ok).toBe(true)
    expect(r.data.ingredients).toHaveLength(1)
    expect(r.data.products).toHaveLength(1)
  })
})

describe('normalize', () => {
  it('欠けたコレクションを空配列で補完する', () => {
    const n = normalize({ ingredients: [{ id: 'x' }] })
    expect(n.ingredients).toHaveLength(1)
    expect(n.doughs).toEqual([])
    expect(n.fillings).toEqual([])
    expect(n.products).toEqual([])
  })
  it('配列でない値は空配列にする', () => {
    const n = normalize({ ingredients: 'oops', doughs: null })
    expect(n.ingredients).toEqual([])
    expect(n.doughs).toEqual([])
  })
})

describe('defaultFilename', () => {
  it('bakery-cost-YYYYMMDD.json 形式（ローカル時刻）', () => {
    expect(defaultFilename(new Date(2026, 5, 3))).toBe('bakery-cost-20260603.json')
    expect(defaultFilename(new Date(2026, 0, 9))).toBe('bakery-cost-20260109.json')
  })
})
