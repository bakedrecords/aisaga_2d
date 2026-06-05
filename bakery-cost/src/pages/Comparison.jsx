// ⑤ 一覧比較（仕様 §7.5）
import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { calcDough, calcFilling, calcProduct, yen } from '../lib/calc.js'
import { rateClass } from './Products.jsx'

const COLUMNS = [
  { key: 'name', label: '商品名', num: false },
  { key: 'totalCost', label: '原価(円)', num: true },
  { key: 'sellingPrice', label: '売値(円)', num: true },
  { key: 'costRate', label: '原価率(%)', num: true },
  { key: 'grossProfit', label: '粗利(円)', num: true },
  { key: 'grossMargin', label: '粗利率(%)', num: true },
]

export default function Comparison() {
  const { ingredients, doughs, fillings, products } = useData()
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  const ingredientMap = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients]
  )
  const doughCostMap = useMemo(
    () => Object.fromEntries(doughs.map((d) => [d.id, calcDough(d, ingredientMap).costPerGram])),
    [doughs, ingredientMap]
  )
  const fillingCostMap = useMemo(
    () =>
      Object.fromEntries(fillings.map((f) => [f.id, calcFilling(f, ingredientMap).costPerGram])),
    [fillings, ingredientMap]
  )

  const rows = useMemo(
    () =>
      products.map((p) => {
        const r = calcProduct(p, { ingredientMap, doughCostMap, fillingCostMap })
        return { id: p.id, name: p.name || '(無名)', ...r }
      }),
    [products, ingredientMap, doughCostMap, fillingCostMap]
  )

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      const cmp =
        typeof x === 'string' || typeof y === 'string'
          ? String(x).localeCompare(String(y), 'ja')
          : (x ?? 0) - (y ?? 0)
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sort])

  const avgRate = useMemo(() => {
    const withPrice = rows.filter((r) => r.sellingPrice > 0)
    if (withPrice.length === 0) return 0
    return withPrice.reduce((s, r) => s + r.costRate, 0) / withPrice.length
  }, [rows])

  function toggleSort(key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  if (products.length === 0) {
    return (
      <section>
        <div className="page-head">
          <h2>⑤ 一覧比較</h2>
        </div>
        <p className="empty-state">
          商品がまだありません。「④ 商品」で商品を追加すると、ここで原価率・粗利を比較できます。
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <h2>⑤ 一覧比較</h2>
        <p className="hint">見出しをクリックすると並べ替えできます（同じ列を再クリックで昇順／降順を反転）。</p>
      </div>

      <div className="table-wrap">
        <table className="grid compare">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={(c.num ? 'num ' : '') + 'sortable'}
                  onClick={() => toggleSort(c.key)}
                  aria-sort={
                    sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  {c.label}
                  {sort.key === c.key && (
                    <span className="sort-arrow">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td data-label="商品名">{r.name}</td>
                <td className="num" data-label="原価(円)">
                  {yen(r.totalCost, 1)}
                </td>
                <td className="num" data-label="売値(円)">
                  {yen(r.sellingPrice, 0)}
                </td>
                <td className={'num ' + rateClass(r.costRate)} data-label="原価率(%)">
                  {yen(r.costRate, 1)}
                </td>
                <td className="num" data-label="粗利(円)">
                  {yen(r.grossProfit, 1)}
                </td>
                <td className="num" data-label="粗利率(%)">
                  {yen(r.grossMargin, 1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="foot-label">平均原価率</td>
              <td className="num" colSpan={2} />
              <td className={'num ' + rateClass(avgRate)}>{yen(avgRate, 1)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
