// UIスモークテスト: 各画面が描画時に例外を投げないことを確認する。
// renderToString は DOM 不要で Node 上で動くため、追加の devDependency なしで
// React ツリー全体の描画エラー（未定義関数・props ミスなど）を検出できる。
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { DataProvider } from './context/DataContext.jsx'
import App from './App.jsx'
import Ingredients from './pages/Ingredients.jsx'
import DoughRecipes from './pages/DoughRecipes.jsx'
import Fillings from './pages/Fillings.jsx'
import Products from './pages/Products.jsx'
import Comparison from './pages/Comparison.jsx'

function render(node) {
  // localStorage が無い環境では seed データで初期化される（storage.js のガード）。
  return renderToString(<DataProvider>{node}</DataProvider>)
}

describe('UIスモーク（描画時エラーが無いこと）', () => {
  it('App 全体（ヘッダー＋タブ＋データ管理）が描画できる', () => {
    const html = render(<App />)
    expect(html).toContain('パン屋 原価計算')
    expect(html).toContain('書き出し')
    expect(html).toContain('読み込み')
  })

  it('各ページがサンプルデータで描画できる', () => {
    expect(render(<Ingredients />)).toContain('仕入れ材料')
    expect(render(<DoughRecipes />)).toContain('ベーカーズ')
    expect(render(<Fillings />)).toContain('フィリング')
    expect(render(<Products />)).toContain('原価率')
    expect(render(<Comparison />)).toContain('一覧比較')
  })
})
