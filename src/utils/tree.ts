/**
 * 平铺列表 → 树。
 *
 * 背景：RuoYi 的一部分「树形」接口实际返回的是平铺列表（典型的是
 * `GET /system/menu/list` → SysMenuServiceImpl#selectMenuList，直接返回 mapper 查出来的
 * 一行行菜单），前端要自己按 parentId 组装成树才能给 ElTable / ElTree 用。
 * 另一部分接口（`/system/user/deptTree`、`/system/menu/treeselect`）后端已经组装好了，
 * 不需要再过这里。
 *
 * 实现要点：
 * - 用 Map 做父节点索引，整体 O(n)，不做「每个节点都扫一遍列表」的 O(n²) 实现；
 * - 能拿到的引用尽量复用（不深拷贝），组件里对行数据的改动（例如菜单页改排序）不会丢；
 * - 找不到父节点的节点**不会丢**，会当成根节点返回（见下方「孤儿节点」说明）。
 */

/**
 * 树节点：`Record<string, any>` 的**类型别名**（不是 interface）。
 *
 * 别名让 `T extends TreeNode` 能容纳任意对象；而按动态 key 读写字段统一走 `asRecord`，
 * 原因见那个函数的注释。
 */
export type TreeNode = Record<string, any>

/**
 * 把泛型节点当成「松散的键值对象」来读写字段。
 *
 * TS 6 的泛型规则：`T extends Record<string, any>` 时，`node[key]` 只允许读
 * （写会直接报 `TS2862: Type 'T' is generic and can only be indexed for reading`），
 * 读出来的值也仍是 `any` / `unknown` 不可直接比较。所以凡是要按动态 key
 * 读写节点字段的地方，统一走这个函数转换一次 —— 集中一处、注释一处。
 *
 * 两种写法都能通过（都验证过），这里选函数式：
 * `(node as Record<string, unknown>)[key] = value` 或 `const target = asRecord(node)`。
 */
function asRecord(node: unknown): Record<string, any> {
  return node as Record<string, any>
}

/** 取节点的某个字段（泛型索引读的安全封装） */
function readField(node: unknown, key: string): any {
  return asRecord(node)[key]
}

/**
 * 判断某个节点本身是不是「根」（parentId 属于约定的根取值）。
 *
 * 用 `Object.is` 而不是 `==`：后端可能把顶级节点的 parentId 给成 0 / "0" / null / ''，
 * 配置里写什么就严格匹配什么，避免 `'0' == 0` 这种隐式转换带来的意外命中。
 */
function isRootValue(value: unknown, values: unknown[]): boolean {
  return values.some((item) => Object.is(item, value))
}

/** 同级排序：sortKey 取不到值或不是数字时保持原顺序（用原下标兜底） */
function sortNodes<T extends TreeNode>(
  nodes: T[],
  sortKey: string | undefined,
  order: 'asc' | 'desc'
): void {
  if (!sortKey || nodes.length < 2) return
  // sort 在不同引擎上的稳定性不一样，值相等时用原下标兜底，保证结果可复现
  const origin = new Map<T, number>()
  nodes.forEach((node, index) => origin.set(node, index))
  nodes.sort((a, b) => {
    const left = readField(a, sortKey)
    const right = readField(b, sortKey)
    const leftEmpty = left === undefined || left === null
    const rightEmpty = right === undefined || right === null
    if (leftEmpty || rightEmpty) {
      if (leftEmpty && rightEmpty) return (origin.get(a) ?? 0) - (origin.get(b) ?? 0)
      // 没有排序值的排到最后，避免 undefined 参与比较
      return leftEmpty ? 1 : -1
    }
    if (left === right) return (origin.get(a) ?? 0) - (origin.get(b) ?? 0)
    const result = left > right ? 1 : -1
    return order === 'desc' ? -result : result
  })
}

/** listToTree 的可选配置（与具体节点类型无关，所以不带泛型） */
export interface ListToTreeOptions {
  /** 节点唯一标识字段，默认 `id` */
  idKey?: string
  /** 父节点标识字段，默认 `parentId` */
  parentKey?: string
  /** 子节点挂载字段，默认 `children` */
  childrenKey?: string
  /**
   * 根节点的 parentId 取值。
   * 默认 `0`（RuoYi 的 sys_menu / sys_dept 用 0 表示顶级）；
   * 后端用 null / '' 表示顶级时，连同 `rootValues` 一起传要匹配的值。
   */
  rootValue?: unknown
  /** 额外的「这算根节点」的取值集合（与 rootValue 一起判断，例如 [null, '', undefined]） */
  rootValues?: unknown[]
  /** 是否按某个字段给同级节点排序（不传保持原列表顺序） */
  sortKey?: string
  /** 同级排序方向，默认升序 */
  sortOrder?: 'asc' | 'desc'
  /** 是否浅拷贝节点后再挂 children（默认 false：直接改写原对象） */
  clone?: boolean
}

/**
 * 递归浅拷贝一棵树（children 换成新数组），让 clone: true 时原列表完全不被改动。
 *
 * `{ ...genericNode }` 得到 `Record<string, unknown>`，这是 TS 6 下展开泛型对象唯一
 * 不报错的写法（直接转 Record 会报 TS2322），所以 copy 声明成 Record 再在末尾断言回 T。
 */
function cloneTree<T extends TreeNode>(nodes: T[], childrenKey: string): T[] {
  return nodes.map((node) => {
    const fullChildren = readField(node, childrenKey)
    const copy: Record<string, unknown> = { ...node }
    if (Array.isArray(fullChildren)) copy[childrenKey] = cloneTree(fullChildren as T[], childrenKey)
    return copy as T
  })
}

/**
 * 把平铺列表组装成树。
 *
 * 规则：
 * 1. 先在 id → 节点的 Map 上建索引；
 * 2. 再遍历一次，节点能找到父节点就挂到父节点的 children 下，否则视为根节点；
 * 3. 配了 sortKey 时只对同级节点排一次序（不影响其它层级）。
 *
 * 「孤儿节点」（父节点不在当前列表里，例如查询条件把父节点过滤掉了、
 * 或者父节点已被删除）会被提升为根节点返回，而不是丢弃 —— 这样数据不会凭空消失，
 * 页面上也能一眼看出层级不对；如果不想看到它们，请在调用处自行过滤。
 *
 * 注意：默认会**直接改写**传入的节点对象（给它们挂上 children）。传 `clone: true`
 * 则只做浅拷贝，原有列表对象不被改动。
 *
 * @example
 * // 菜单：parentId = 0 是顶级，同级按 orderNum 升序
 * const tree = listToTree(rows, { idKey: 'menuId', sortKey: 'orderNum' })
 *
 * @example
 * // 顶级是 null / '' 的情况
 * const tree = listToTree(rows, { rootValues: [null, '', undefined] })
 */
export function listToTree<T extends TreeNode>(
  list: T[] | null | undefined,
  options: ListToTreeOptions = {}
): T[] {
  const {
    idKey = 'id',
    parentKey = 'parentId',
    childrenKey = 'children',
    rootValue = 0,
    rootValues,
    sortKey,
    sortOrder = 'asc',
    clone = false
  } = options

  if (!Array.isArray(list) || list.length === 0) return []

  // 根取值集合：rootValue 永远算一个，rootValues 用来补充 null / '' 等其它写法
  const rootMatchers = rootValues ? [rootValue, ...rootValues] : [rootValue]

  /** id → 节点（值统一转字符串做键：后端 Long 到前端都是 number，但脏数据里可能有字符串） */
  const nodeMap = new Map<string, T>()
  for (const item of list) {
    const id = readField(item, idKey)
    if (id === undefined || id === null) continue
    nodeMap.set(String(id), item)
  }

  // 预设 children 字段：统一成数组，避免后端返回 null 或老数据里是字符串
  for (const item of list) {
    const children = readField(item, childrenKey)
    if (children !== undefined && !Array.isArray(children)) {
      asRecord(item)[childrenKey] = []
    }
  }

  const roots: T[] = []
  for (const source of list) {
    if (!source) continue
    const parentId = readField(source, parentKey)
    const parent =
      parentId === undefined || parentId === null || isRootValue(parentId, rootMatchers)
        ? undefined
        : nodeMap.get(String(parentId))

    // 没有父节点（顶级 / 孤儿）都是根
    if (!parent || parent === source) {
      roots.push(source)
      continue
    }
    const target = asRecord(parent)
    const children: unknown[] = Array.isArray(target[childrenKey]) ? target[childrenKey] : []
    children.push(source)
    target[childrenKey] = children
  }

  // 清理没有子节点的 children 字段？不清理 —— ElTable 的 tree-props 会自己判断，
  // 留着空数组还能让「取 children[0]」这类代码少一次判空。
  if (sortKey) {
    const sortRecursive = (nodes: T[]): void => {
      sortNodes(nodes, sortKey, sortOrder)
      for (const node of nodes) {
        const children = readField(node, childrenKey)
        if (Array.isArray(children) && children.length > 0) sortRecursive(children as T[])
      }
    }
    sortRecursive(roots)
  }

  return clone ? cloneTree(roots, childrenKey) : roots
}

export default listToTree
