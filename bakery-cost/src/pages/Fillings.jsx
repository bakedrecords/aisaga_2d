// ③ フィリング（仕様 §7.3）
import { useMemo } from 'react'
import { useData } from '../context/DataContext.jsx'
import { calcFilling, yen } from '../lib/calc.js'
import { baseUnitLabel } from '../lib/units.js'
import NumInput from '../components/NumInput.jsx'
import RefSelect from '../components/RefSelect.jsx'

export default function Fillings() {
  const {
    ingredients,
    fillings,
    addFilling,
    updateFilling,
    removeFilling,
    addFillingItem,
    updateFillingItem,
    removeFillingItem,
  } = useData()

  const ingredientMap = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients]
  )

  return (
    <section>
      <div className="page-head">
        <h2>③ フィリング</h2>
        <p className="hint">
          具材の使用量から総原価と1gあたり原価を計算します。煮詰めロスがある場合は
          「出来上がり量」を入力してください（例: 材料600g → 煮詰めて400g）。
        </p>
      </div>

      {fillings.map((filling) => {
        const r = calcFilling(filling, ingredientMap)
        return (
          <div className="card" key={filling.id}>
            <div className="card-head">
              <input
                className="card-title"
                aria-label="フィリング名"
                value={filling.name}
                onChange={(e) => updateFilling(filling.id, { name: e.target.value })}
              />
              <button
                className="icon danger"
                title="このフィリングを削除"
                aria-label="フィリングを削除"
                onClick={() => removeFilling(filling.id)}
              >
                ×
              </button>
            </div>

            <input
              className="note"
              placeholder="メモ（任意）"
              aria-label="フィリングメモ"
              value={filling.note}
              onChange={(e) => updateFilling(filling.id, { note: e.target.value })}
            />

            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th>材料</th>
                    <th className="num">使用量</th>
                    <th className="num">原価(円)</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {filling.items.map((it, idx) => {
                    const row = r.breakdown[idx]
                    const ing = ingredientMap[it.ingredientId]
                    return (
                      <tr key={it.id}>
                        <td data-label="材料">
                          <RefSelect
                            aria-label="材料"
                            value={it.ingredientId}
                            options={ingredients}
                            placeholder="（材料を選択）"
                            onChange={(v) =>
                              updateFillingItem(filling.id, it.id, { ingredientId: v })
                            }
                          />
                        </td>
                        <td className="num" data-label="使用量">
                          <span className="with-suffix">
                            <NumInput
                              aria-label="使用量"
                              value={it.amount}
                              onChange={(v) => updateFillingItem(filling.id, it.id, { amount: v })}
                            />
                            <em>{ing ? baseUnitLabel(ing.unit) : ''}</em>
                          </span>
                        </td>
                        <td className="num" data-label="原価(円)">
                          {yen(row.cost, 1)}
                        </td>
                        <td className="row-actions">
                          <button
                            className="icon danger"
                            title="削除"
                            aria-label="材料を削除"
                            onClick={() => removeFillingItem(filling.id, it.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filling.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty">
                        材料がありません。「＋材料を追加」で追加してください。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button className="link-add" onClick={() => addFillingItem(filling.id)}>
              ＋材料を追加
            </button>

            <div className="summary">
              <div>
                <span>出来上がり量(g)</span>
                <NumInput
                  className="inline-num"
                  aria-label="出来上がり量"
                  blankZero
                  placeholder={String(Math.round(r.totalAmount))}
                  value={filling.yieldAmount}
                  onChange={(v) => updateFilling(filling.id, { yieldAmount: v })}
                />
              </div>
              <div>
                <span>総原価</span>
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

      <button className="big-add" onClick={addFilling}>
        ＋フィリングを追加
      </button>
    </section>
  )
}
