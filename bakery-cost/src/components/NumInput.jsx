import { useEffect, useRef, useState } from 'react'

// 数値入力の小さな部品。
// 内部は文字列で保持し、入力中は「1.」「1.5」など途中の表記をそのまま表示する
// （ベーカーズ%の小数入力をスムーズにするため）。確定値は number を onChange に渡す。
function fmt(v, blankZero) {
  if (v == null || Number.isNaN(Number(v))) return ''
  if (blankZero && Number(v) === 0) return ''
  return String(v)
}

export default function NumInput({ value, onChange, blankZero = false, ...rest }) {
  const [text, setText] = useState(() => fmt(value, blankZero))
  const focused = useRef(false)

  // 外部から値が変わったとき（編集中でなければ）表示を同期する。
  useEffect(() => {
    if (!focused.current) setText(fmt(value, blankZero))
  }, [value, blankZero])

  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      min="0"
      {...rest}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setText(fmt(value, blankZero))
      }}
      onChange={(e) => {
        const t = e.target.value
        setText(t)
        const n = Number(t)
        onChange(t === '' ? 0 : Number.isFinite(n) ? n : 0)
      }}
    />
  )
}
