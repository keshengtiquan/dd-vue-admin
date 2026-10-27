import { isEmpty } from './validate'

/**
 * 表单 / 查询参数的空值清洗配置。
 *
 * 默认全开（见 defaultSanitizeOutput），语义是"把没有筛选意义的值从参数里去掉"，
 * 而不是"把所有假值都去掉"：数字 0、布尔 false 默认按有效值保留。
 */
export interface SanitizeOutputOptions {
  /** 移除空字符串（含纯空白字符串） */
  removeEmptyString: boolean
  /** 移除空数组 */
  removeEmptyArray: boolean
  /** 移除清洗后为空的对象 */
  removeEmptyObject: boolean
  /** 移除空富文本占位内容，如 <p><br></p> */
  removeEmptyRichText: boolean
  /** 保留数字 0 这类有效筛选值 */
  keepZero: boolean
  /** 保留 false 这类有效筛选值 */
  keepFalse: boolean
}

/** 默认配置：查询栏与表单提交都基于它，调用方可用 sanitizeOutput 局部覆盖 */
export const defaultSanitizeOutput: SanitizeOutputOptions = {
  removeEmptyString: true,
  removeEmptyArray: true,
  removeEmptyObject: true,
  removeEmptyRichText: true,
  keepZero: true,
  keepFalse: true
}

/** 富文本里这些标签代表有实际内容（图片 / 媒体 / 表格 / 分割线），不能凭"剥掉标签后为空"就丢弃 */
const RICH_TEXT_CONTENT_TAG_RE = /<(img|video|audio|iframe|embed|table|hr|svg)\b/i
/** 是否"看起来像 html"：避免把普通文本走富文本判断 */
const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i

/**
 * 判断富文本是否为空占位。
 * 只对"看起来像 html"的字符串生效：`<p><br></p>`、`<p>&nbsp;</p>`、`<p> </p>` 视为空；
 * 含图片 / 视频 / 表格等内容标签的一律视为非空，避免误删有效内容。
 */
export function isEmptyRichText(value: unknown): boolean {
  if (typeof value !== 'string') return false
  if (!HTML_TAG_RE.test(value)) return false
  if (RICH_TEXT_CONTENT_TAG_RE.test(value)) return false
  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\s/g, '')
  return text === ''
}

/** 合并默认配置，得到一份完整的清洗配置 */
export function resolveSanitizeOutput(
  options?: Partial<SanitizeOutputOptions>
): SanitizeOutputOptions {
  return { ...defaultSanitizeOutput, ...options }
}

/** 普通对象判定（不含 Date / File / 数组等实例） */
const isPlainObject = (value: unknown): value is Record<string, any> => {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

/** 单个值是否应被视为"空"（依据清洗配置与 keepZero / keepFalse 开关） */
export function isBlankValue(value: unknown, options: SanitizeOutputOptions): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') {
    if (value.trim() === '') return options.removeEmptyString
    return options.removeEmptyRichText && isEmptyRichText(value)
  }
  if (typeof value === 'number') return value === 0 ? !options.keepZero : Number.isNaN(value)
  if (typeof value === 'boolean') return value === false ? !options.keepFalse : false
  if (Array.isArray(value)) return options.removeEmptyArray && value.length === 0
  if (isPlainObject(value)) return options.removeEmptyObject && Object.keys(value).length === 0
  // Date / File / Map / Set 等实例交给 utils/validate 的 isEmpty 判断（Map / Set 空集视为空）
  return isEmpty(value)
}

/**
 * 清洗一份表单数据：**返回新对象，不修改入参**。
 *
 * - 键被判定为空时直接从结果里移除（查询参数不会出现 `a=` 这种无效项）；
 * - 只做浅层处理：嵌套对象只在"整体为空"时移除，对象内部不再递归清洗；
 * - 传入 null / undefined 时返回空对象，方便直接当请求参数用。
 *
 * @param source 待清洗的表单数据
 * @param options 清洗配置的局部覆盖
 */
export function sanitizeFormData<T extends Record<string, any>>(
  source: T | null | undefined,
  options?: Partial<SanitizeOutputOptions>
): Partial<T> {
  const result: Record<string, any> = {}
  if (!source || typeof source !== 'object') return result as Partial<T>
  const config = resolveSanitizeOutput(options)
  Object.keys(source).forEach((key) => {
    const value = source[key]
    if (!isBlankValue(value, config)) result[key] = value
  })
  return result as Partial<T>
}
