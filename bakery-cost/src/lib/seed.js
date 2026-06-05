// 初回サンプルデータ（仕様 §6.1）。localStorage が空のとき投入される。
import { newId } from './id.js'

/** 毎回新しい ID でサンプル一式を生成する（初期化・サンプルに戻す で使用）。 */
export function makeSeed() {
  const flour = ing('強力粉', 280, 1, 'kg', '1kg 280円')
  const water = ing('水', 0, 1, 'l', '原価ゼロ換算')
  const salt = ing('塩', 120, 1, 'kg', '')
  const yeast = ing('ドライイースト', 600, 500, 'g', '')
  const butter = ing('バター（無塩）', 900, 450, 'g', '')
  const sugar = ing('砂糖', 200, 1, 'kg', '')
  const egg = ing('卵', 300, 10, 'piece', '1個=約50g')
  const anko = ing('つぶあん（既製）', 500, 1, 'kg', '')

  const ingredients = [flour, water, salt, yeast, butter, sugar, egg, anko]

  const dough = {
    id: newId(),
    name: '食パン生地',
    note: 'ベーカーズ% で入力（粉=100基準）',
    items: [
      doughItem(flour.id, 100),
      doughItem(water.id, 68),
      doughItem(salt.id, 2),
      doughItem(yeast.id, 1.5),
      doughItem(butter.id, 5),
      doughItem(sugar.id, 6),
    ],
  }

  const filling = {
    id: newId(),
    name: 'つぶあん',
    note: '既製あんをそのまま使用',
    yieldAmount: 0, // 0 = 材料合計重量を採用
    items: [fillingItem(anko.id, 1000)],
  }

  const products = [
    {
      id: newId(),
      name: '食パン1斤',
      note: '',
      sellingPrice: 400,
      components: [component('dough', dough.id, 450)],
    },
    {
      id: newId(),
      name: 'あんパン',
      note: '',
      sellingPrice: 180,
      components: [component('dough', dough.id, 60), component('filling', filling.id, 40)],
    },
  ]

  return { ingredients, doughs: [dough], fillings: [filling], products }
}

function ing(name, purchasePrice, purchaseAmount, unit, note) {
  return { id: newId(), name, purchasePrice, purchaseAmount, unit, note }
}
function doughItem(ingredientId, percent) {
  return { id: newId(), ingredientId, percent }
}
function fillingItem(ingredientId, amount) {
  return { id: newId(), ingredientId, amount }
}
function component(type, refId, amount) {
  return { id: newId(), type, refId, amount }
}
