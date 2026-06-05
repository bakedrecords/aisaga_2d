import { useRef, useState } from 'react'
import { useData } from './context/DataContext.jsx'
import { parseImport } from './lib/io.js'
import Ingredients from './pages/Ingredients.jsx'
import DoughRecipes from './pages/DoughRecipes.jsx'
import Fillings from './pages/Fillings.jsx'
import Products from './pages/Products.jsx'
import Comparison from './pages/Comparison.jsx'

const TABS = [
  { id: 'ingredients', label: '① 仕入れ', Component: Ingredients },
  { id: 'doughs', label: '② 生地', Component: DoughRecipes },
  { id: 'fillings', label: '③ フィリング', Component: Fillings },
  { id: 'products', label: '④ 商品', Component: Products },
  { id: 'comparison', label: '⑤ 一覧比較', Component: Comparison },
]

export default function App() {
  const { exportData, importData, resetToSeed, clearAll, toasts, dismissToast } = useData()
  const [active, setActive] = useState('ingredients')
  const fileRef = useRef(null)

  const Active = TABS.find((t) => t.id === active)?.Component ?? Ingredients

  // ── インポート（§6.3）────────────────────────────────────
  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImport(String(reader.result))
      if (!result.ok) {
        // 失敗時は既存データを一切変更しない（§6.3-5）
        window.alert('読み込みに失敗しました。\n\n' + result.error)
      } else {
        const ok = window.confirm(
          '現在のデータを読み込んだ内容で上書きします。よろしいですか？\n' +
            '（不安な場合は先に「書き出し」でバックアップしてください）'
        )
        if (ok) {
          if (result.futureVersion) {
            window.alert(
              'このファイルは新しいバージョンで作られています。一部反映されない場合があります。'
            )
          }
          importData(result.data)
        }
      }
      // 同じファイルを連続で選べるようにリセット（§6.3-6）
      e.target.value = ''
    }
    reader.onerror = () => {
      window.alert('ファイルの読み込み中にエラーが発生しました。')
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  function onResetToSeed() {
    if (window.confirm('現在のデータを破棄して、サンプルデータに戻します。よろしいですか？')) {
      resetToSeed()
    }
  }
  function onClearAll() {
    if (window.confirm('すべてのデータを削除します。元に戻せません。よろしいですか？')) {
      clearAll()
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🥐</span>
          <div className="brand-text">
            <h1>パン屋 原価計算</h1>
            <p className="brand-sub">材料原価から 原価率・粗利 を積み上げ計算</p>
          </div>
        </div>

        <div className="data-actions">
          <button onClick={exportData} title="全データをJSONファイルに書き出す（バックアップ）">
            書き出し
          </button>
          <button onClick={() => fileRef.current?.click()} title="JSONファイルからデータを読み込む">
            読み込み
          </button>
          <button className="ghost" onClick={onResetToSeed} title="サンプルデータに戻す">
            サンプルに戻す
          </button>
          <button className="ghost danger" onClick={onClearAll} title="すべてのデータを削除する">
            初期化
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileChange}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      </header>

      <nav className="tabs" aria-label="セクション">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'tab' + (active === t.id ? ' active' : '')}
            onClick={() => setActive(t.id)}
            aria-current={active === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        <Active />
      </main>

      <footer className="app-footer">
        <p>
          データはお使いのブラウザ内にのみ保存されます。サーバーには送信されません。
          ブラウザのデータを消すと失われるため、定期的に「書き出し」でバックアップしてください。
        </p>
      </footer>

      {/* 通知トースト（§6.6）。クリックで消える。 */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} className={'toast ' + t.type} onClick={() => dismissToast(t.id)}>
            {t.message}
          </button>
        ))}
      </div>
    </div>
  )
}
