// localStorage 読み書き（仕様 §6.1）
export const STORAGE_KEY = 'bakery-cost:v1'

/** 起動時の読み込み。無ければ null（呼び出し側で seed 初期化）。 */
export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch (e) {
    console.error('[storage] load failed', e)
    return null
  }
}

/**
 * 保存。成功で { ok:true }、失敗で { ok:false, error, quota }。
 * QuotaExceededError（容量超過）は UI に通知する（§6.6）。
 */
export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    console.error('[storage] save failed', e)
    return { ok: false, error: e, quota: isQuotaError(e) }
  }
}

/** localStorage のデータを削除（データ初期化, §7.0.1）。 */
export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('[storage] clear failed', e)
  }
}

function isQuotaError(e) {
  return (
    typeof DOMException !== 'undefined' &&
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}
