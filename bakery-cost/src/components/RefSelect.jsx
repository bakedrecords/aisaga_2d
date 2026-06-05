// 参照（材料/生地/フィリング）を選ぶ select。
// 参照先が削除済みなどで options に存在しない値のときは「(不明な材料)」等の
// 選択肢を補い、UI 上で気づけるようにする（仕様 §4 参照整合性。落とさない）。
export default function RefSelect({
  value,
  onChange,
  options,
  placeholder = '（選択）',
  unknownLabel = '(不明な材料)',
  ...rest
}) {
  const known = value === '' || options.some((o) => o.id === value)
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name || '(無名)'}
        </option>
      ))}
      {!known && <option value={value}>{unknownLabel}</option>}
    </select>
  )
}
