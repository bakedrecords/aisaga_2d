// 全データの状態管理＋CRUD＋自動保存（仕様 §6.1 / §11）
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { load, save, clearStorage } from '../lib/storage.js'
import { makeSeed } from '../lib/seed.js'
import { normalize, downloadJson } from '../lib/io.js'
import { newId } from '../lib/id.js'

const DataContext = createContext(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData は DataProvider の内側で使ってください。')
  return ctx
}

/** 起動時のデータ。localStorage にあれば正規化して採用、無ければ seed。 */
function initData() {
  const loaded = load()
  return loaded ? normalize(loaded) : makeSeed()
}

export function DataProvider({ children }) {
  const [data, setData] = useState(initData)
  const [toasts, setToasts] = useState([])

  // ── トースト通知（§6.6）─────────────────────────────────
  const notify = useCallback((message, type = 'info') => {
    const id = newId()
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000)
  }, [])
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  // ── 自動保存（§6.1）。変更のたびに保存し、容量超過は通知（§6.6）──
  useEffect(() => {
    const res = save(data)
    if (!res.ok) {
      notify(
        res.quota
          ? '保存容量がいっぱいです。不要なデータを減らすか「書き出し」でバックアップしてください。'
          : '自動保存に失敗しました。',
        'error'
      )
    }
  }, [data, notify])

  // ── 汎用ヘルパ ───────────────────────────────────────────
  const setColl = useCallback((key, updater) => {
    setData((d) => ({ ...d, [key]: updater(d[key]) }))
  }, [])
  const patchIn = (arr, id, patch) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x))
  const removeFrom = (arr, id) => arr.filter((x) => x.id !== id)
  // 親(parentId)の items/components 配列を差し替える
  const editChildren = (arr, parentId, childKey, fn) =>
    arr.map((p) => (p.id === parentId ? { ...p, [childKey]: fn(p[childKey]) } : p))

  // ── ① 仕入れ ─────────────────────────────────────────────
  const addIngredient = useCallback((partial = {}) => {
    const ing = {
      id: newId(),
      name: '',
      purchasePrice: 0,
      purchaseAmount: 0,
      unit: 'g',
      note: '',
      ...partial,
    }
    setColl('ingredients', (arr) => [...arr, ing])
    return ing.id
  }, [setColl])
  const updateIngredient = useCallback((id, patch) => {
    setColl('ingredients', (arr) => patchIn(arr, id, patch))
  }, [setColl])
  const removeIngredient = useCallback((id) => {
    setColl('ingredients', (arr) => removeFrom(arr, id))
  }, [setColl])

  // ── ② 生地 ───────────────────────────────────────────────
  const addDough = useCallback(() => {
    const dough = { id: newId(), name: '新しい生地', note: '', items: [] }
    setColl('doughs', (arr) => [...arr, dough])
    return dough.id
  }, [setColl])
  const updateDough = useCallback((id, patch) => {
    setColl('doughs', (arr) => patchIn(arr, id, patch))
  }, [setColl])
  const removeDough = useCallback((id) => {
    setColl('doughs', (arr) => removeFrom(arr, id))
  }, [setColl])
  const addDoughItem = useCallback((doughId, ingredientId = '') => {
    setColl('doughs', (arr) =>
      editChildren(arr, doughId, 'items', (items) => [
        ...items,
        { id: newId(), ingredientId, percent: 0 },
      ])
    )
  }, [setColl])
  const updateDoughItem = useCallback((doughId, itemId, patch) => {
    setColl('doughs', (arr) =>
      editChildren(arr, doughId, 'items', (items) => patchIn(items, itemId, patch))
    )
  }, [setColl])
  const removeDoughItem = useCallback((doughId, itemId) => {
    setColl('doughs', (arr) =>
      editChildren(arr, doughId, 'items', (items) => removeFrom(items, itemId))
    )
  }, [setColl])

  // ── ③ フィリング ─────────────────────────────────────────
  const addFilling = useCallback(() => {
    const f = { id: newId(), name: '新しいフィリング', note: '', yieldAmount: 0, items: [] }
    setColl('fillings', (arr) => [...arr, f])
    return f.id
  }, [setColl])
  const updateFilling = useCallback((id, patch) => {
    setColl('fillings', (arr) => patchIn(arr, id, patch))
  }, [setColl])
  const removeFilling = useCallback((id) => {
    setColl('fillings', (arr) => removeFrom(arr, id))
  }, [setColl])
  const addFillingItem = useCallback((fillingId, ingredientId = '') => {
    setColl('fillings', (arr) =>
      editChildren(arr, fillingId, 'items', (items) => [
        ...items,
        { id: newId(), ingredientId, amount: 0 },
      ])
    )
  }, [setColl])
  const updateFillingItem = useCallback((fillingId, itemId, patch) => {
    setColl('fillings', (arr) =>
      editChildren(arr, fillingId, 'items', (items) => patchIn(items, itemId, patch))
    )
  }, [setColl])
  const removeFillingItem = useCallback((fillingId, itemId) => {
    setColl('fillings', (arr) =>
      editChildren(arr, fillingId, 'items', (items) => removeFrom(items, itemId))
    )
  }, [setColl])

  // ── ④ 商品 ───────────────────────────────────────────────
  const addProduct = useCallback(() => {
    const p = { id: newId(), name: '新しい商品', note: '', sellingPrice: 0, components: [] }
    setColl('products', (arr) => [...arr, p])
    return p.id
  }, [setColl])
  const updateProduct = useCallback((id, patch) => {
    setColl('products', (arr) => patchIn(arr, id, patch))
  }, [setColl])
  const removeProduct = useCallback((id) => {
    setColl('products', (arr) => removeFrom(arr, id))
  }, [setColl])
  const addProductComponent = useCallback((productId, comp = {}) => {
    setColl('products', (arr) =>
      editChildren(arr, productId, 'components', (cs) => [
        ...cs,
        { id: newId(), type: 'ingredient', refId: '', amount: 0, ...comp },
      ])
    )
  }, [setColl])
  const updateProductComponent = useCallback((productId, componentId, patch) => {
    setColl('products', (arr) =>
      editChildren(arr, productId, 'components', (cs) => patchIn(cs, componentId, patch))
    )
  }, [setColl])
  const removeProductComponent = useCallback((productId, componentId) => {
    setColl('products', (arr) =>
      editChildren(arr, productId, 'components', (cs) => removeFrom(cs, componentId))
    )
  }, [setColl])

  // ── データ管理（§6 / §7.0.1）─────────────────────────────
  const exportData = useCallback(() => {
    downloadJson(data)
    notify('データを書き出しました。', 'success')
  }, [data, notify])

  /** インポート: 渡された AppData で state を置き換える（localStorage は useEffect で保存）。 */
  const importData = useCallback((appData) => {
    const norm = normalize(appData)
    setData(norm)
    notify(
      `読み込みました（材料 ${norm.ingredients.length} / 生地 ${norm.doughs.length} / ` +
        `フィリング ${norm.fillings.length} / 商品 ${norm.products.length}）。`,
      'success'
    )
  }, [notify])

  const resetToSeed = useCallback(() => {
    setData(makeSeed())
    notify('サンプルデータに戻しました。', 'success')
  }, [notify])

  const clearAll = useCallback(() => {
    clearStorage()
    setData({ ingredients: [], doughs: [], fillings: [], products: [] })
    notify('データを初期化しました。', 'success')
  }, [notify])

  const value = {
    // state
    ingredients: data.ingredients,
    doughs: data.doughs,
    fillings: data.fillings,
    products: data.products,
    // ①
    addIngredient, updateIngredient, removeIngredient,
    // ②
    addDough, updateDough, removeDough,
    addDoughItem, updateDoughItem, removeDoughItem,
    // ③
    addFilling, updateFilling, removeFilling,
    addFillingItem, updateFillingItem, removeFillingItem,
    // ④
    addProduct, updateProduct, removeProduct,
    addProductComponent, updateProductComponent, removeProductComponent,
    // データ管理
    exportData, importData, resetToSeed, clearAll,
    // 通知
    toasts, notify, dismissToast,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
