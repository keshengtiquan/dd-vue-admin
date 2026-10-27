/**
 * 判断url是否是http或https
 * @param url
 * @returns {Boolean}
 */
export function isHttp(url: string): boolean {
  return url.indexOf('http://') !== -1 || url.indexOf('https://') !== -1
}

/**
 * 判断值是否为空
 * 覆盖以下情况视为「空」：
 *   - null / undefined
 *   - 空字符串、纯空白字符串，以及字面量 'undefined' / 'null'
 *   - 空数组 []
 *   - 空对象 {}（不含任何自有可枚举属性）
 *   - 空 Map / Set
 * 注意：数字 0、布尔 false、空字符串以外的字符串均视为「非空」。
 * @param value
 * @returns {Boolean}
 */
export function isEmpty(value: any): boolean {
  // null / undefined
  if (value === null || value === undefined) {
    return true
  }

  // 字符串：空串、纯空白，以及字面量 'undefined' / 'null'
  if (typeof value === 'string') {
    const str = value.trim()
    return str === '' || str === 'undefined' || str === 'null'
  }

  // 数组：无元素视为空
  if (Array.isArray(value)) {
    return value.length === 0
  }

  // Map / Set：无条目视为空
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0
  }

  // 对象：仅对「普通对象」按自有可枚举属性数量判断；
  // 其他实例（Date / File / Blob / 自定义类等）一律视为非空，避免误判
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value)
    if (proto === null || proto === Object.prototype) {
      return Object.keys(value).length === 0
    }
    return false
  }

  // 其余类型（number / boolean / function / symbol 等）视为非空
  return false
}

/**
 * 判断值是否非空（isEmpty 的反义方法）
 * @param value
 * @returns {Boolean}
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value)
}

/**
 * 路径匹配器
 * 支持通配符：* 匹配单层（不含 /），** 匹配多层（含 /），? 匹配单个字符（不含 /）
 * @param pattern 匹配模式，如 '/system/**'
 * @param path 待匹配的路径
 * @returns {Boolean}
 */
export function isPathMatch(pattern: string, path: string): boolean {
  const regexPattern = pattern
    // 转义正则特殊字符（字符类内 '[' 无需转义、']' 必须转义；$& 表示匹配到的整体）
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*')
    .replace(/\?/g, '[^/]')
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(path)
}
