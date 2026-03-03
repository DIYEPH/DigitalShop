export function parsePgEnumArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((it) => String(it));
  if (typeof value === 'string') {
    const trimmed = value.replace(/^\{|\}$/g, '').trim();
    if (!trimmed) return [];
    return trimmed.split(',').map((s) => s.trim());
  }
  return [];
}
