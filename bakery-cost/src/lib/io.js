// JSON エクスポート / インポート（仕様 §6）
export const SCHEMA_VERSION = 1
export const APP_NAME = 'bakery-cost'

/** §6.2 AppData をファイル用オブジェクトに包む。 */
export function buildExport(data) {
  return {
    app: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/** §6.2 既定のファイル名 bakery-cost-YYYYMMDD.json（日付はローカル時刻）。 */
export function defaultFilename(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `bakery-cost-${y}${m}${d}.json`
}

/** §6.2 ブラウザで JSON をダウンロードさせる。 */
export function downloadJson(data, filename) {
  const payload = buildExport(data)
  const text = JSON.stringify(payload, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? defaultFilename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * §6.3 ファイルのテキストを検証して AppData を返す。
 * 失敗時は { ok:false, error }（例外は投げない）。
 * 成功時は { ok:true, data, futureVersion }。
 */
export function parseImport(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: 'JSONとして読み込めませんでした。ファイルが壊れている可能性があります。',
    }
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'データ形式が不正です。' }
  }

  // 後方互換: { data:{...} } 形式と、AppData を直に書いた形式の両方を許容（§6.3 / §6.4）
  const payload =
    raw.data && typeof raw.data === 'object' ? raw : { data: raw, schemaVersion: 0 }

  // 現行より新しいバージョンのファイルは取り込みつつ警告（§6.5）
  const version = Number(payload.schemaVersion) || 0
  const futureVersion = version > SCHEMA_VERSION

  const migrated = migrate(payload)
  const data = normalize(migrated)
  return { ok: true, data, futureVersion }
}

/** §6.5 スキーマバージョン差を吸収。今は v1 のみ。将来ここに旧→新の変換を足す。 */
export function migrate(payload) {
  const version = Number(payload.schemaVersion) || 0
  let data = payload.data ?? {}
  // 例) if (version < 2) { data = { ...data, /* v2で追加した項目の初期値 */ } }
  void version
  return data
}

/** §6.3 各コレクションを配列に正規化し、未知キーを落とす。 */
export function normalize(data) {
  const arr = (v) => (Array.isArray(v) ? v : [])
  const d = data ?? {}
  return {
    ingredients: arr(d.ingredients),
    doughs: arr(d.doughs),
    fillings: arr(d.fillings),
    products: arr(d.products),
  }
}
