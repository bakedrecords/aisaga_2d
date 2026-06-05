// ① 仕入れ（仕様 §7.1）
import { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { unitCost, yen } from '../lib/calc.js'
import { UNIT_OPTIONS, UNITS, baseUnitLabel } from '../lib/units.js'
import NumInput from '../components/NumInput.jsx'

const EMPTY_DRAFT = { name: '', purchasePrice: '', purchaseAmount: '', unit: 'g', note: '' }

export default function Ingredients() {
  const { ingredients, addIngredient, updateIngredient, removeIngredient } = useData()
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const canAdd = draft.name.trim() !== '' && Number(draft.purchaseAmount) > 0

  function commitAdd() {
    if (!canAdd) return
    addIngredient({
      name: draft.name.trim(),
      purchasePrice: Number(draft.purchasePrice) || 0,
      purchaseAmount: Number(draft.purchaseAmount) || 0,
      unit: draft.unit,
      note: draft.note.trim(),
    })
    setDraft(EMPTY_DRAFT)
  }
  const onDraftKey = (e) => {
    if (e.key === 'Enter') commitAdd()
  }

  return (
    <section>
      <div className="page-head">
        <h2>① 仕入れ材料</h2>
        <p className="hint">
          仕入れた価格と量を登録すると、最小単位（g / ml / 個）あたりの単価を自動計算します。
        </p>
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>材料名</th>
              <th className="num">仕入れ価格(円)</th>
              <th className="num">仕入れ量</th>
              <th>単位</th>
              <th className="num">単価</th>
              <th>メモ</th>
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing.id}>
                <td data-label="材料名">
                  <input
                    aria-label="材料名"
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                  />
                </td>
                <td className="num" data-label="仕入れ価格(円)">
                  <NumInput
                    aria-label="仕入れ価格"
                    value={ing.purchasePrice}
                    onChange={(v) => updateIngredient(ing.id, { purchasePrice: v })}
                  />
                </td>
                <td className="num" data-label="仕入れ量">
                  <NumInput
                    aria-label="仕入れ量"
                    value={ing.purchaseAmount}
                    onChange={(v) => updateIngredient(ing.id, { purchaseAmount: v })}
                  />
                </td>
                <td data-label="単位">
                  <select
                    aria-label="単位"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(ing.id, { unit: e.target.value })}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {UNITS[u].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="num strong" data-label="単価">
                  {yen(unitCost(ing), 3)}
                  <span className="unit-suffix"> 円/{baseUnitLabel(ing.unit)}</span>
                </td>
                <td data-label="メモ">
                  <input
                    aria-label="メモ"
                    value={ing.note}
                    onChange={(e) => updateIngredient(ing.id, { note: e.target.value })}
                  />
                </td>
                <td className="row-actions">
                  <button
                    className="icon danger"
                    title="この材料を削除"
                    aria-label="削除"
                    onClick={() => removeIngredient(ing.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  材料がありません。下の行から追加してください。
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="new-row">
              <td data-label="材料名">
                <input
                  placeholder="材料名"
                  aria-label="新規 材料名"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  onKeyDown={onDraftKey}
                />
              </td>
              <td className="num" data-label="仕入れ価格(円)">
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="新規 仕入れ価格"
                  value={draft.purchasePrice}
                  onChange={(e) => setDraft({ ...draft, purchasePrice: e.target.value })}
                  onKeyDown={onDraftKey}
                />
              </td>
              <td className="num" data-label="仕入れ量">
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="新規 仕入れ量"
                  value={draft.purchaseAmount}
                  onChange={(e) => setDraft({ ...draft, purchaseAmount: e.target.value })}
                  onKeyDown={onDraftKey}
                />
              </td>
              <td data-label="単位">
                <select
                  aria-label="新規 単位"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {UNITS[u].label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="num muted">—</td>
              <td data-label="メモ">
                <input
                  placeholder="メモ"
                  aria-label="新規 メモ"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  onKeyDown={onDraftKey}
                />
              </td>
              <td className="row-actions">
                <button className="add" disabled={!canAdd} onClick={commitAdd} title="材料を追加">
                  追加
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
