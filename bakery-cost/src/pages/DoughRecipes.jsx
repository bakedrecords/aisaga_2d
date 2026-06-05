// ② 生地（ベーカーズ%）（仕様 §7.2）
import { useMemo } from 'react'
import { useData } from '../context/DataContext.jsx'
import { calcDough, yen } from '../lib/calc.js'
import NumInput from '../components/NumInput.jsx'
import RefSelect from '../components/RefSelect.jsx'

export default function DoughRecipes() {
  const {
    ingredients,
    doughs,
    addDough,
    updateDough,
    removeDough,
    addDoughItem,
    updateDoughItem,
    removeDoughItem,
  } = useData()

  const ingredientMap = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients]
  )

  return (
    <section>
      <div className="page-head">
        <h2>② 生地（ベーカーズ%）</h2>
        <p className="hint">
          粉の総量を100%とした重量比で入力します。原価は粉1,000gを基準に計算した1gあたりの値です。
          ※ベーカーズ%は重量比のため、卵・牛乳なども<strong>正味重量(g)</strong>での材料登録を推奨します。
        </p>
      </div>

      {doughs.map((dough) => {
        const r = calcDough(dough, ingredientMap)
        return (
          <div className="card" key={dough.id}>
            <div className="card-head">
              <input
                className="card-title"
                aria-label="生地名"
                value={dough.name}
                onChange={(e) => updateDough(dough.id, { name: e.target.value })}
              />
              <button
                className="icon danger"
                title="この生地を削除"
                aria-label="生地を削除"
                onClick={() => removeDough(dough.id)}
              >
                ×
              </button>
            </div>

            <input
              className="note"
              placeholder="メモ（任意）"
              aria-label="生地メモ"
              value={dough.note}
              onChange={(e) => updateDough(dough.id, { note: e.target.value })}
            />

            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th>材料</th>
                    <th className="num">ベーカーズ%</th>
                    <th className="num">
                      重量(g)<span className="th-sub">粉1kg時</span>
                    </th>
                    <th className="num">原価(円)</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {dough.items.map((it, idx) => {
                    const row = r.breakdown[idx]
                    return (
                      <tr key={it.id}>
                        <td data-label="材料">
                          <RefSelect
                            aria-label="材料"
                            value={it.ingredientId}
                            options={ingredients}
                            placeholder="（材料を選択）"
                            onChange={(v) =>
                              updateDoughItem(dough.id, it.id, { ingredientId: v })
                            }
                          />
                        </td>
                        <td className="num" data-label="ベーカーズ%">
                          <NumInput
                            aria-label="ベーカーズ%"
                            value={it.percent}
                            onChange={(v) => updateDoughItem(dough.id, it.id, { percent: v })}
                          />
                        </td>
                        <td className="num muted" data-label="重量(g)">
                          {yen(row.weight, 0)}
                        </td>
                        <td className="num" data-label="原価(円)">
                          {yen(row.cost, 1)}
                        </td>
                        <td className="row-actions">
                          <button
                            className="icon danger"
                            title="削除"
                            aria-label="材料を削除"
                            onClick={() => removeDoughItem(dough.id, it.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {dough.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        材料がありません。「＋材料を追加」で追加してください。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button className="link-add" onClick={() => addDoughItem(dough.id)}>
              ＋材料を追加
            </button>

            <div className="summary">
              <div>
                <span>合計%</span>
                <b>{yen(r.totalPercent, 1)}%</b>
              </div>
              <div>
                <span>生地総重量</span>
                <b>{yen(r.totalWeight, 0)} g</b>
              </div>
              <div>
                <span>生地総原価</span>
                <b>{yen(r.totalCost, 1)} 円</b>
              </div>
              <div className="highlight">
                <span>1gあたり原価</span>
                <b>{yen(r.costPerGram, 3)} 円/g</b>
              </div>
            </div>
          </div>
        )
      })}

      <button className="big-add" onClick={addDough}>
        ＋生地を追加
      </button>
    </section>
  )
}
