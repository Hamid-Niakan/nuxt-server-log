export function parseStackTrace(stack?: string, depth: number = 10): string[] {
  if (!stack) return []
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
    .slice(0, depth)
}
