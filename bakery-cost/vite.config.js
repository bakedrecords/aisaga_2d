import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 完全な静的サイト（§8）。
// GitHub Pages 等でサブパス配信する場合は base を設定する。
// 例: リポジトリ直下なら base: '/<repo名>/'、独自ドメイン/ルート配信なら不要。
//   base: '/bakery-cost/',
export default defineConfig({
  plugins: [react()],
  test: {
    // calc.js / io.js は純粋関数なので Node 環境でテストできる。
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
