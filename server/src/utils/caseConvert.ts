/**
 * Convert snake_case keys to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert an object's keys from snake_case to camelCase (shallow)
 */
export function toCamelCase<T = any>(obj: Record<string, any>): T {
  if (!obj) return obj
  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    result[snakeToCamel(key)] = obj[key]
  }
  return result as T
}

/**
 * Convert an array of objects from snake_case to camelCase
 */
export function toCamelCaseArray<T = any>(arr: Record<string, any>[]): T[] {
  if (!arr) return []
  return arr.map(item => toCamelCase<T>(item))
}
