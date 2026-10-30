<template>
  <!--
    参照 RuoYi-Element 的 system/user 页面结构：一张带边框的卡片，上面查询栏、下面表格。
    参考页左侧还有部门树，但后端没有部门查询接口（DeptController 只有创建），
    所以这里不做 —— 等后端补 /system/dept/tree 之类的接口再加回来。
  -->
  <div
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-(--el-border-color) bg-(--el-bg-color)"
  >
    <!-- 查询条件：用户名称 / 用户昵称 / 状态（后端 UserQueryDTO 支持的三项） -->
    <SearchForm
      v-model="query"
      class="shrink-0 border-b border-(--el-border-color) px-4 pt-4"
      search-text="搜索"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!--
      min-h-0 不能删：flex 子项默认 min-height: auto，会给表格撑出一个「内容高度」下限，
      查询栏变化时整页会出滚动条。
    -->
    <div class="mt-2 min-h-0 flex-1 px-4 pb-4">
      <BasicTable
        v-model:pagination="pagination"
        :data="tableData"
        :columns="columns"
        :loading="loading"
        :auto-height="true"
        border
        empty-text="暂无用户数据"
        @refresh="getTableData"
        @page-change="getTableData"
      >
        <!-- 工具条左侧：只放「新增」。批量删除 / 导入 / 导出后端都没有接口 -->
        <template #header-left>
          <ElButton type="primary" @click="handleAdd">
            <AppIcon name="Plus" class="mr-1" :size="14" />
            新增
          </ElButton>
        </template>

        <!-- 状态：只读标签。切换状态需要 changeStatus 接口，后端没有 -->
        <template #status="{ row }">
          <ElTag :type="row.status === '0' ? 'success' : 'danger'" size="small">
            {{ row.status === '0' ? '正常' : '停用' }}
          </ElTag>
        </template>

        <!-- 行内操作：目前只有删除（修改接口是空实现，先不给入口） -->
        <template #operation="{ row }">
          <ElButton
            v-if="!isSuperAdmin(row as UserRow)"
            link
            type="danger"
            @click="handleDelete(row as UserRow)"
          >
            删除
          </ElButton>
          <span v-else class="text-(--el-text-color-placeholder)">-</span>
        </template>
      </BasicTable>
    </div>

    <!-- 新增用户：字段按后端 UserCreateDTO，后端没有的（部门/角色/岗位）不出现 -->
    <ElDialog v-model="dialogVisible" title="新增用户" width="720px" top="6vh">
      <BasicForm
        ref="formRef"
        v-model="formData"
        :items="formItems"
        :span="12"
        :gutter="20"
        label-width="84px"
        submit-text="保存"
        reset-text="取消"
        @submit="handleSubmit"
        @reset="dialogVisible = false"
      />
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ElButton, ElDialog, ElMessage, ElMessageBox, ElTag } from 'element-plus'
import AppIcon from '@/components/AppIcon/index.vue'
import BasicTable from '@/components/BasicTable/index.vue'
import type { ColumnOption, PaginationConfig } from '@/components/BasicTable/types'
import { BasicForm, SearchForm, type FormItem } from '@/components/Form'
import {
  createUserApi,
  deleteUserApi,
  getUserPageApi,
  type UserPageQuery,
  type UserRow
} from '@/api/system/user'
import { sanitizeFormData } from '@/utils/sanitize'

// keep-alive 按组件名匹配，名字需与路由 cacheName 一致
// （后端菜单 component = 'system/user/index' → componentToName 推导出 'SystemUser'）
defineOptions({ name: 'SystemUser' })

// ---------------------------------------------------------------------------
// 查询条件
// ---------------------------------------------------------------------------

type UserSearchForm = {
  /** 登录账号（模糊匹配） */
  userName?: string
  /** 用户昵称（模糊匹配） */
  nickName?: string
  /** 账号状态（精确匹配） */
  status?: string
}

const query = ref<UserSearchForm>({})

/**
 * 状态下拉选项。
 * 表格列与查询栏共用一份 —— 这里只有这一处「文案 + 值」的对应关系，
 * 不像参考页还要区分 filters 的 text/value 与表单的 label/value。
 */
const STATUS_OPTIONS = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' }
]

const searchItems: FormItem[] = [
  { key: 'userName', label: '用户名称', type: 'input', placeholder: '请输入登录账号' },
  { key: 'nickName', label: '用户昵称', type: 'input', placeholder: '请输入用户昵称' },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择',
    options: STATUS_OPTIONS,
    props: { clearable: true }
  }
]

// ---------------------------------------------------------------------------
// 表格列
// ---------------------------------------------------------------------------

const columns: ColumnOption[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'userName', label: '用户名称', minWidth: 160, align: 'center' },
  { prop: 'nickName', label: '用户昵称', minWidth: 160, align: 'center' },
  { prop: 'phoneNumber', label: '手机号码', minWidth: 160, align: 'center' },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    slots: { default: 'status' }
  },
  { prop: 'createTime', label: '创建时间', width: 180, align: 'center' },
  { label: '操作', width: 120, fixed: 'right', align: 'center', slots: { default: 'operation' } }
]

// ---------------------------------------------------------------------------
// 列表数据
// ---------------------------------------------------------------------------

const tableData = ref<UserRow[]>([])
const loading = ref(false)

const pagination = ref<PaginationConfig>({
  current: 1,
  size: 10,
  total: 0
})

/** 查询条件 → 接口参数：空字符串、空数组在这里统一剔除 */
const buildQueryParams = (): UserPageQuery => ({
  pageNum: pagination.value.current,
  pageSize: pagination.value.size,
  ...sanitizeFormData(query.value)
})

/** 取数：分页状态由 BasicTable 通过 v-model:pagination 同步，这里只负责请求 */
const getTableData = async (): Promise<void> => {
  loading.value = true
  try {
    const { list, total } = await getUserPageApi(buildQueryParams())
    tableData.value = list ?? []
    pagination.value.total = Number(total ?? 0)
  } finally {
    loading.value = false
  }
}

/** 查询回到第 1 页 */
const handleSearch = (): void => {
  pagination.value.current = 1
  void getTableData()
}

/** 重置：SearchForm 已经把 model 恢复成挂载快照，这里只需回第 1 页重新取数 */
const handleReset = (): void => {
  pagination.value.current = 1
  void getTableData()
}

// ---------------------------------------------------------------------------
// 新增 / 删除
// ---------------------------------------------------------------------------

/** 超级管理员（userId = 1）不给删除入口，避免把自己删掉后进不了系统 */
const isSuperAdmin = (row: UserRow): boolean => row.userId === 1

const dialogVisible = ref(false)
const formRef = ref<InstanceType<typeof BasicForm> | null>(null)
const formData = ref<Record<string, any>>({})

/** 性别（sys_user.sex：0 男 / 1 女 / 2 未知，后端不传默认 2） */
const SEX_OPTIONS = [
  { label: '男', value: '0' },
  { label: '女', value: '1' },
  { label: '未知', value: '2' }
]

/**
 * 表单字段：与后端 UserCreateDTO 一一对应。
 *
 * 刻意没有「归属部门 / 角色 / 岗位」三项 —— 部门树和角色列表都没有查询接口，
 * 放上去只能填假数据。后端补齐后在这里加回去即可（部门用 treeselect，角色用多选）。
 */
const formItems: FormItem[] = [
  {
    key: 'userName',
    label: '登录账号',
    type: 'input',
    required: true,
    placeholder: '请输入登录账号',
    props: { maxlength: 30 },
    rules: [
      {
        pattern: /^[a-zA-Z0-9_]{2,30}$/,
        message: '2-30 个字符，只能包含字母、数字和下划线',
        trigger: 'blur'
      }
    ]
  },
  {
    key: 'nickName',
    label: '用户昵称',
    type: 'input',
    required: true,
    placeholder: '请输入用户昵称',
    props: { maxlength: 30 }
  },
  {
    key: 'password',
    label: '用户密码',
    type: 'password',
    required: true,
    placeholder: '请输入用户密码',
    props: { maxlength: 20, showPassword: true },
    rules: [{ min: 6, max: 20, message: '密码长度需在 6 到 20 之间', trigger: 'blur' }]
  },
  {
    key: 'phoneNumber',
    label: '手机号码',
    type: 'input',
    placeholder: '请输入手机号码',
    props: { maxlength: 11 },
    // 非必填：留空放过（isEmptyValue 时 pattern 不校验），填了就必须是 11 位手机号
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
  },
  {
    key: 'email',
    label: '邮箱',
    type: 'input',
    placeholder: '请输入邮箱',
    props: { maxlength: 50 },
    rules: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
  },
  {
    key: 'sex',
    label: '性别',
    type: 'select',
    placeholder: '请选择',
    options: SEX_OPTIONS,
    defaultValue: '2'
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择',
    options: STATUS_OPTIONS,
    defaultValue: '0'
  },
  {
    key: 'remark',
    label: '备注',
    type: 'textarea',
    span: 24,
    props: { rows: 3, maxlength: 500, showWordLimit: true, placeholder: '请输入内容' }
  }
]

/** 新增表单的初始值：点「取消」回到这份空表单 */
const EMPTY_USER_FORM = {
  userName: '',
  nickName: '',
  password: '',
  phoneNumber: '',
  email: '',
  sex: '2',
  status: '0',
  remark: ''
}

const handleAdd = async (): Promise<void> => {
  formData.value = { ...EMPTY_USER_FORM }
  dialogVisible.value = true
  // 弹窗内容首次是懒渲染的，等一帧再拿 ref 才拿得到
  await nextTick()
  formRef.value?.setInitialModel({ ...EMPTY_USER_FORM })
  formRef.value?.clearValidate()
}

/** 提交（BasicForm 已校验并清洗过 payload） */
const handleSubmit = async (payload: Record<string, any>): Promise<void> => {
  await createUserApi({
    userName: String(payload.userName ?? ''),
    nickName: String(payload.nickName ?? ''),
    password: String(payload.password ?? ''),
    phoneNumber: payload.phoneNumber ? String(payload.phoneNumber) : '',
    email: payload.email ? String(payload.email) : '',
    sex: String(payload.sex ?? '2'),
    status: String(payload.status ?? '0'),
    remark: payload.remark ? String(payload.remark) : ''
  })
  ElMessage.success('新增成功')
  dialogVisible.value = false
  // 新增的用户可能排在别的页，回第 1 页看最新数据
  pagination.value.current = 1
  await getTableData()
}

const handleDelete = async (row: UserRow): Promise<void> => {
  try {
    await ElMessageBox.confirm(`是否确认删除用户「${row.userName}」？`, '提示', {
      type: 'warning'
    })
  } catch {
    // 点了取消 / 关闭
    return
  }
  await deleteUserApi(row.userId)
  ElMessage.success('删除成功')
  await getTableData()
}

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------

onMounted(() => {
  void getTableData()
})
</script>
