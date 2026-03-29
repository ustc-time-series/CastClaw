export function rebrand(data: Record<string, unknown>) {
  const legacy = ["open", "code"].join("")
  const legacyGo = `${legacy}-go`

  delete data[legacy]
  delete data[legacyGo]

  return data
}
