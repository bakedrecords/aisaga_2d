// ④ 商品（仕様 §7.4）
import { useMemo } from 'react'
import { useData } from '../context/DataContext.jsx'
import { calcDough, calcFilling, calcProduct, yen } from '../lib/calc.js'
import { baseUnitLabel } from '../lib/units.js'
import NumInput from '../components/NumInput.jsx'
import RefSelect from '../components/RefSelect.jsx'

// 原価率の色分け（〜30%緑 / 〜40%橙 / 40%超 赤）。売値未設定(0)は中立。
export function rateClass(rate) {
  if (!(rate > 0)) return ''
  if (rate <= 30) return 'rate-good'
  if (rate <= 40) return 'rate-warn'
  return 'rate-bad'
}

export default function Products() {
  const {
    ingredients,
    doughs,
    fillings,
    products,
    addProduct,
    updateProduct,
    removeProduct,
    addProductComponent,
    updateProductComponent,
    removeProductComponent,
  } = useData()

  const ingredientMap = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients]
  )
  // 生地・フィリングの 1g 原価マップを事前算出して calcProduct に渡す（§7.4）
  const doughCostMap = useMemo(
    () => Object.fromEntries(doughs.map((d) => [d.id, calcDough(d, ingredientMap).costPerGram])),
    [doughs, ingredientMap]
  )
  const fillingCostMap = useMemo(
    () =>
      Object.fromEntries(fillings.map((f) => [f.id, calcFilling(f, ingredientMap).costPerGram])),
    [fillings, ingredientMap]
  )
  const maps = { ingredientMap, doughCostMap, fillingCostMap }

  function optionsFor(type) {
    if (type === 'dough') return doughs
    if (type === 'filling') return fillings
    return ingredients
  }
  function firstRefOf(type) {
    return optionsFor(type)[0]?.id ?? ''
  }
  function unitSuffix(type, refId) {
    if (type === 'ingredient') {
      const ing = ingredientMap[refId]
      return ing ? baseUnitLabel(ing.unit) : ''
    }
    return 'g' // 生地・フィリングは g 基準
  }
  function onChangeType(productId, comp, type) {
    // 種類を変えたら対象をその種類の先頭にリセット（§7.4）
    updateProductComponent(productId, comp.id, { type, refId: firstRefOf(type) })
  }

  return (
    <section>
      <div className="page-head">
        <h2>④ 商品</h2>
        <p className="hint">
          生地・フィリング・直接材料を組み合わせて商品原価を計算します。売値（税抜）を入れると
          原価率・粗利が出ます。
        </p>
      </div>

      {products.map((product) => {
        const r = calcProduct(product, maps)
        return (
          <div className="card" key={product.id}>
            <div className="card-head">
              <input
                className="card-title"
                aria-label="商品名"
                value={product.name}
                onChange={(e) => updateProduct(product.id, { name: e.target.value })}
              />
              <button
                className="icon danger"
                title="この商品を削除"
                aria-label="商品を削除"
                onClick={() => removeProduct(product.id)}
              >
                ×
              </button>
            </div>

            <input
              className="note"
              placeholder="メモ（任意）"
              aria-label="商品メモ"
              value={product.note}
              onChange={(e) => updateProduct(product.id, { note: e.target.value })}
            />

            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th>種類</th>
                    <th>対象</th>
                    <th className="num">使用量</th>
                    <th className="num">単価</th>
                    <th className="num">原価(円)</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {product.components.map((comp, idx) => {
                    const row = r.breakdown[idx]
                    return (
                      <tr key={comp.id}>
                        <td data-label="種類">
                          <select
                            aria-label="種類"
                            value={comp.type}
                            onChange={(e) => onChangeType(product.id, comp, e.target.value)}
                          >
                            <option value="dough">生地</option>
                            <option value="filling">フィリング</option>
                            <option value="ingredient">材料</option>
                          </select>
                        </td>
                        <td data-label="対象">
                          <RefSelect
                            aria-label="対象"
                            value={comp.refId}
                            options={optionsFor(comp.type)}
                            placeholder="（選択）"
                            unknownLabel={
                              comp.type === 'dough'
                                ? '(不明な生地)'
                                : comp.type === 'filling'
                                  ? '(不明なフィリング)'
                                  : '(不明な材料)'
                            }
                            onChange={(v) =>
                              updateProductComponent(product.id, comp.id, { refId: v })
                            }
                          />
                        </td>
                        <td className="num" data-label="使用量">
                          <span className="with-suffix">
                            <NumInput
                              aria-label="使用量"
                              value={comp.amount}
                              onChange={(v) =>
                                updateProductComponent(product.id, comp.id, { amount: v })
                              }
                            />
                            <em>{unitSuffix(comp.type, comp.refId)}</em>
                          </span>
                        </td>
                        <td className="num muted" data-label="単価">
                          {yen(row.perUnit, 3)}
                        </td>
                        <td className="num" data-label="原価(円)">
                          {yen(row.cost, 1)}
                        </td>
                        <td className="row-actions">
                          <button
                            className="icon danger"
                            title="削除"
                            aria-label="構成を削除"
                            onClick={() => removeProductComponent(product.id, comp.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {product.components.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty">
                        構成材料がありません。「＋構成を追加」で追加してください。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              className="link-add"
              onClick={() => addProductComponent(product.id, { type: 'dough', refId: firstRefOf('dough') })}
            >
              ＋構成を追加
            </button>

            <div className="metrics">
              <div className="metric">
                <span>原価</span>
                <b>{yen(r.totalCost, 1)} 円</b>
              </div>
              <div className="metric">
                <span>売値(税抜)</span>
                <NumInput
                  className="inline-num"
                  aria-label="売値"
                  blankZero
                  placeholder="0"
                  value={product.sellingPrice}
                  onChange={(v) => updateProduct(product.id, { sellingPrice: v })}
                />
              </div>
              <div className={'metric ' + rateClass(r.costRate)}>
                <span>原価率</span>
                <b>{yen(r.costRate, 1)}%</b>
              </div>
              <div className="metric">
                <span>粗利</span>
                <b>{yen(r.grossProfit, 1)} 円</b>
              </div>
            </div>
          </div>
        )
      })}

      <button className="big-add" onClick={addProduct}>
        ＋商品を追加
      </button>
    </section>
  )
}
