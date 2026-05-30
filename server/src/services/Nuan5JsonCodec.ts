/**
 * nuan5json 编解码器
 *
 * 叠纸游戏自定义JSON变体，支持非字符串Map键。
 * 当Map的键不全是字符串时，序列化为 `[:key:value]` 数组格式。
 *
 * 移植自 nikki_albums 的 GameJsonCodec (Dart)
 */

export class Nuan5JsonCodec {
  /**
   * 编码为 nuan5json 字符串
   * @param source 要编码的数据
   * @param standard 是否强制使用标准JSON格式（忽略非字符串键的特殊处理）
   * @param spaceNum 缩进空格数，<=0 则紧凑输出
   * @param expandEmptyObject 是否展开空对象/空数组（带换行缩进）
   */
  static encode(
    source: unknown,
    options: {
      standard?: boolean
      spaceNum?: number
      expandEmptyObject?: boolean
    } = {}
  ): string {
    const { standard = false, spaceNum = 2, expandEmptyObject = false } = options
    if (spaceNum <= 0) {
      return this._encode(source, standard)
    }
    return this._formatEncode(source, standard, spaceNum, expandEmptyObject, 0)
  }

  /**
   * 解码 nuan5json 字符串
   */
  static decode(source: string): unknown {
    source = source.trim()
    if (source === 'null') return null
    if (source === 'true') return true
    if (source === 'false') return false
    if (source.startsWith('"')) return this._decodeString(source)
    if (source.startsWith('[')) {
      // 跳过 [ 后的空白，检查是否是 : 开头的非字符串键Map
      let i = 1
      while (i < source.length && this._isWhitespace(source[i])) {
        i++
      }
      return source[i] === ':'
        ? this._decodeSpecialMap(source)
        : this._decodeList(source)
    }
    if (source.startsWith('{')) return this._decodeMap(source)
    // 尝试解析为数字
    const asInt = parseInt(source, 10)
    if (!isNaN(asInt) && String(asInt) === source) return asInt
    const asFloat = parseFloat(source)
    if (!isNaN(asFloat) && String(asFloat) === source) return asFloat
    return source
  }

  // ==================== 编码内部方法 ====================

  private static _encodeString(input: string): string {
    let result = '"'
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i)
      switch (ch) {
        case 0x22: // "
          result += '\\"'
          break
        case 0x5C: // backslash
          result += '\\\\'
          break
        case 0x08: // \b
          result += '\\b'
          break
        case 0x0C: // \f
          result += '\\f'
          break
        case 0x0A: // \n
          result += '\\n'
          break
        case 0x0D: // \r
          result += '\\r'
          break
        case 0x09: // \t
          result += '\\t'
          break
        default:
          if (ch < 0x20) {
            result += '\\u' + ch.toString(16).padStart(4, '0')
          } else {
            result += input[i]
          }
      }
    }
    result += '"'
    return result
  }

  private static _encode(source: unknown, standard: boolean): string {
    if (
      source === null ||
      source === undefined ||
      typeof source === 'number' ||
      typeof source === 'boolean'
    ) {
      return String(source)
    }
    if (typeof source === 'string') {
      return this._encodeString(source)
    }
    if (Array.isArray(source)) {
      return `[${source.map((v) => this._encode(v, standard)).join(',')}]`
    }
    if (source instanceof Map) {
      const entries: [unknown, unknown][] = []
      source.forEach((v, k) => entries.push([k, v]))
      const allKeyIsString = entries.every(([key]) => typeof key === 'string')
      if (allKeyIsString || standard) {
        return `{${entries.map(([k, v]) => `${this._encodeString(String(k))}:${this._encode(v, standard)}`).join(',')}}`
      } else {
        // 非字符串键 → [:key:value] 格式
        return `[${entries.map(([k, v]) => `:${this._encode(k, standard)}:${this._encode(v, standard)}`).join(',')}]`
      }
    }
    if (typeof source === 'object') {
      const entries = Object.entries(source as Record<string, unknown>)
      const allKeyIsString = entries.every(([key]) => typeof key === 'string')
      if (allKeyIsString || standard) {
        return `{${entries.map(([k, v]) => `${this._encodeString(k)}:${this._encode(v, standard)}`).join(',')}}`
      } else {
        // 非字符串键 → [:key:value] 格式
        return `[${entries.map(([k, v]) => `:${this._encode(k, standard)}:${this._encode(v, standard)}`).join(',')}]`
      }
    }
    return this._encodeString(String(source))
  }

  private static _formatEncode(
    source: unknown,
    standard: boolean,
    spaceNum: number,
    expandEmptyObject: boolean,
    level: number
  ): string {
    const space = ' '.repeat(spaceNum * level)
    const nextSpace = ' '.repeat(spaceNum * (level + 1))

    if (
      source === null ||
      source === undefined ||
      typeof source === 'number' ||
      typeof source === 'boolean'
    ) {
      return String(source)
    }
    if (typeof source === 'string') {
      return this._encodeString(source)
    }
    if (Array.isArray(source)) {
      if (source.length === 0 && !expandEmptyObject) return '[]'
      return `[\n${nextSpace}${source.map((v) => this._formatEncode(v, standard, spaceNum, expandEmptyObject, level + 1)).join(`,\n${nextSpace}`)}\n${space}]`
    }
    if (source instanceof Map) {
      const entries: [unknown, unknown][] = []
      source.forEach((v, k) => entries.push([k, v]))
      if (entries.length === 0 && !expandEmptyObject) return '{}'
      const allKeyIsString = entries.every(([key]) => typeof key === 'string')
      if (allKeyIsString || standard) {
        return `{\n${nextSpace}${entries.map(([k, v]) => `${this._encodeString(String(k))}: ${this._formatEncode(v, standard, spaceNum, expandEmptyObject, level + 1)}`).join(`,\n${nextSpace}`)}\n${space}}`
      } else {
        return `[\n${nextSpace}${entries.map(([k, v]) => `:${this._formatEncode(k, standard, spaceNum, expandEmptyObject, level + 1)}:${this._formatEncode(v, standard, spaceNum, expandEmptyObject, level + 1)}`).join(`,\n${nextSpace}`)}\n${space}]`
      }
    }
    if (typeof source === 'object') {
      const entries = Object.entries(source as Record<string, unknown>)
      if (entries.length === 0 && !expandEmptyObject) return '{}'
      const allKeyIsString = entries.every(([key]) => typeof key === 'string')
      if (allKeyIsString || standard) {
        return `{\n${nextSpace}${entries.map(([k, v]) => `${this._encodeString(k)}: ${this._formatEncode(v, standard, spaceNum, expandEmptyObject, level + 1)}`).join(`,\n${nextSpace}`)}\n${space}}`
      } else {
        return `[\n${nextSpace}${entries.map(([k, v]) => `:${this._formatEncode(k, standard, spaceNum, expandEmptyObject, level + 1)}:${this._formatEncode(v, standard, spaceNum, expandEmptyObject, level + 1)}`).join(`,\n${nextSpace}`)}\n${space}]`
      }
    }
    return this._encodeString(String(source))
  }

  // ==================== 解码内部方法 ====================

  private static _isWhitespace(c: string): boolean {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r'
  }

  private static _decodeString(s: string): string {
    let result = ''
    for (let i = 1; i < s.length - 1; i++) {
      if (s[i] === '\\' && i + 1 < s.length - 1) {
        const escapeMap: Record<string, string> = {
          '"': '"',
          '\\': '\\',
          '/': '/',
          b: '\b',
          f: '\f',
          n: '\n',
          r: '\r',
          t: '\t',
        }
        const mapped = escapeMap[s[i + 1]]
        if (mapped !== undefined) {
          result += mapped
          i++
          continue
        }
        if (s[i + 1] === 'u' && i + 5 < s.length - 1) {
          const code = parseInt(s.substring(i + 2, i + 6), 16)
          if (!isNaN(code)) {
            result += String.fromCharCode(code)
            i += 5
            continue
          }
        }
      }
      result += s[i]
    }
    return result
  }

  /**
   * 在顶层分割逗号分隔的元素，考虑嵌套括号和字符串
   */
  private static _split(s: string): string[] {
    const result: string[] = []
    let depth = 0
    let j = 0
    let inQuote = false
    let escaped = false

    for (let i = 0; i < s.length; i++) {
      if (escaped) {
        escaped = false
        continue
      }
      if (s[i] === '\\') {
        escaped = true
        continue
      }
      if (s[i] === '"') {
        inQuote = !inQuote
        continue
      }
      if (inQuote) continue
      if (s[i] === '[' || s[i] === '{') depth++
      if (s[i] === ']' || s[i] === '}') depth--
      if (s[i] === ',' && depth === 0) {
        result.push(s.substring(j, i).trim())
        j = i + 1
      }
    }
    result.push(s.substring(j).trim())
    return result.filter((x) => x.length > 0)
  }

  private static _decodeList(s: string): unknown[] {
    return this._split(s.substring(1, s.length - 1)).map((item) =>
      this.decode(item)
    )
  }

  private static _decodeMap(s: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const entry of this._split(s.substring(1, s.length - 1))) {
      const colonIdx = this._findTopLevelColon(entry)
      if (colonIdx === -1) continue
      const key = this.decode(entry.substring(0, colonIdx).trim()) as string
      const value = this.decode(entry.substring(colonIdx + 1).trim())
      result[key] = value
    }
    return result
  }

  /**
   * 解码非字符串键的Map格式 [:key:value]
   */
  private static _decodeSpecialMap(s: string): Map<unknown, unknown> {
    const result = new Map<unknown, unknown>()
    const inner = s.substring(1, s.length - 1)
    for (const entry of this._split(inner)) {
      let trimmed = entry.trim()
      // 跳过开头的 : 及其后的空白
      if (!trimmed.startsWith(':')) continue
      let i = 1
      while (i < trimmed.length && this._isWhitespace(trimmed[i])) {
        i++
      }
      trimmed = trimmed.substring(i)

      const colonIdx = this._findTopLevelColon(trimmed)
      if (colonIdx === -1) continue
      const key = this.decode(trimmed.substring(0, colonIdx).trim())
      const value = this.decode(trimmed.substring(colonIdx + 1).trim())
      result.set(key, value)
    }
    return result
  }

  /**
   * 查找顶层的冒号位置（不在嵌套括号或字符串内的冒号）
   */
  private static _findTopLevelColon(s: string): number {
    let depth = 0
    let inQuote = false
    let escaped = false

    for (let i = 0; i < s.length; i++) {
      if (escaped) {
        escaped = false
        continue
      }
      if (s[i] === '\\') {
        escaped = true
        continue
      }
      if (s[i] === '"') {
        inQuote = !inQuote
        continue
      }
      if (inQuote) continue
      if (s[i] === '[' || s[i] === '{') depth++
      if (s[i] === ']' || s[i] === '}') depth--
      if (s[i] === ':' && depth === 0) return i
    }
    return -1
  }

  /**
   * 将 Map 对象转换为普通对象（用于JSON序列化）
   * 如果Map的键全是字符串，直接转为对象
   * 否则，键会被toString()处理
   */
  static mapToObject(map: Map<unknown, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    map.forEach((value, key) => {
      const strKey = String(key)
      if (value instanceof Map) {
        result[strKey] = this.mapToObject(value)
      } else {
        result[strKey] = value
      }
    })
    return result
  }

  /**
   * 深度转换：将解码结果中的所有Map递归转为普通对象
   */
  static normalizeResult(data: unknown): unknown {
    if (data instanceof Map) {
      return this.mapToObject(data)
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.normalizeResult(item))
    }
    if (data !== null && typeof data === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        result[key] = this.normalizeResult(value)
      }
      return result
    }
    return data
  }
}
