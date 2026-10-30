<template>
  <div class="flex flex-col gap-4 p-4">
    <section class="rounded-lg bg-(--el-bg-color) p-4">
      <h1 class="text-base font-medium text-(--el-text-color-primary)">JSON 驱动表单</h1>
      <p class="mt-1 text-sm text-(--el-text-color-secondary)">
        下面两个表单都由 JSON（items）生成：展开收起、必填校验、字段联动、异步选项、字典字段映射、
        自定义按钮都在这一页里。配置说明见 <code>doc/json-form.md</code>。
      </p>
    </section>

    <section class="rounded-lg bg-(--el-bg-color) p-4">
      <h2 class="text-sm font-medium text-(--el-text-color-primary)">SearchForm · 查询栏</h2>
      <p class="mt-1 mb-3 text-xs text-(--el-text-color-secondary)">
        每行 24 / span = 4 列，收起时留 1 列给按钮，所以满 3 项后出现「展开」；
        「用户状态」选中「停用」后「停用原因」才出现（字段联动）。
      </p>
      <SearchForm
        v-model="query"
        :items="searchItems"
        @search="handleSearch"
        @reset="handleReset"
      />
      <pre
        class="mt-3 overflow-x-auto rounded bg-(--el-fill-color-light) p-3 text-xs text-(--el-text-color-regular)"
        >{{ searchOutput }}</pre>
    </section>

    <section class="rounded-lg bg-(--el-bg-color) p-4">
      <h2 class="text-sm font-medium text-(--el-text-color-primary)">BasicForm · 新增 / 编辑</h2>
      <p class="mt-1 mb-3 text-xs text-(--el-text-color-secondary)">
        弹窗里是 <code>&lt;BasicForm&gt;</code>（span = 12，两列布局）：提交前自动校验并清洗空值，
        校验不过不会抛 submit；编辑时用 <code>setModel</code> + <code>setInitialModel</code> 回显。
      </p>
      <div class="flex gap-2">
        <ElButton type="primary" @click="openCreate">新增用户</ElButton>
        <ElButton @click="openEdit">编辑用户（回显）</ElButton>
      </div>
      <pre
        class="mt-3 overflow-x-auto rounded bg-(--el-fill-color-light) p-3 text-xs text-(--el-text-color-regular)"
        >{{ submitOutput }}</pre>
    </section>

    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="680px" top="15vh">
      <BasicForm
        ref="formRef"
        v-model="formData"
        :items="formItems"
        :span="12"
        label-width="92px"
        @submit="handleSubmit"
      />
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { BasicForm, type FormItem } from '@/components/Form'

// keep-alive 按组件名匹配，名字需与路由 meta.cacheName 一致（见 routes/modules/main.ts）
defineOptions({ name: 'DashboardHome' })

/** 字典模拟：后端常见的 dictLabel / dictValue 结构，用 optionKeys 映射成 label / value */
const statusDict = [
  { dictLabel: '正常', dictValue: '0' },
  { dictLabel: '停用', dictValue: '1' }
]

/** 部门树模拟：异步函数，返回 value / label / children（真实项目里换成部门接口即可） */
const loadDeptTree = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [
    {
      value: 1,
      label: '若依科技',
      children: [
        { value: 11, label: '研发部门' },
        { value: 12, label: '市场部门' }
      ]
    },
    {
      value: 2,
      label: '深圳总公司',
      children: [{ value: 21, label: '测试部门' }]
    }
  ]
}

// ---------------------------------------------------------------------------
// 查询栏
// ---------------------------------------------------------------------------

const query = ref<Record<string, any>>({})
const searchOutput = ref(
  '点「查询」看看清洗后的参数：空字符串 / 空数组 / 空对象会被剔除，0 和 false 保留'
)

const searchItems: FormItem[] = [
  { key: 'userName', label: '用户名称', type: 'input', placeholder: '请输入用户名称' },
  {
    key: 'status',
    label: '用户状态',
    type: 'select',
    options: statusDict,
    optionKeys: { label: 'dictLabel', value: 'dictValue' },
    placeholder: '请选择状态'
  },
  {
    key: 'deptId',
    label: '归属部门',
    type: 'treeselect',
    options: loadDeptTree,
    props: { checkStrictly: true, placeholder: '请选择归属部门' }
  },
  {
    key: 'dateRange',
    label: '创建时间',
    type: 'daterange',
    span: 8,
    props: {
      valueFormat: 'YYYY-MM-DD',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      unlinkPanels: true
    }
  },
  {
    key: 'auditRemark',
    label: '停用原因',
    type: 'input',
    placeholder: '状态为停用时才出现',
    hidden: (model) => model.status !== '1'
  }
]

const handleSearch = (payload: Record<string, any>): void => {
  searchOutput.value = `search 事件 payload：\n${JSON.stringify(payload, null, 2)}`
}

const handleReset = (): void => {
  searchOutput.value = 'reset 事件：查询条件已恢复初始值'
}

// ---------------------------------------------------------------------------
// 新增 / 编辑表单
// ---------------------------------------------------------------------------

const formData = ref<Record<string, any>>({})
const formRef = ref<InstanceType<typeof BasicForm> | null>(null)
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const submitOutput = ref('提交后会在这里显示清洗后的数据')

const formItems: FormItem[] = [
  {
    key: 'userName',
    label: '用户名称',
    type: 'input',
    required: true,
    placeholder: '请输入用户名称',
    tooltip: '登录账号，2-20 个字符'
  },
  {
    key: 'nickName',
    label: '用户昵称',
    type: 'input',
    required: true,
    placeholder: '请输入用户昵称'
  },
  {
    key: 'deptId',
    label: '归属部门',
    type: 'treeselect',
    required: true,
    options: loadDeptTree,
    props: { checkStrictly: true, placeholder: '请选择归属部门' }
  },
  {
    key: 'status',
    label: '用户状态',
    type: 'radiogroup',
    required: true,
    defaultValue: '0',
    options: statusDict,
    optionKeys: { label: 'dictLabel', value: 'dictValue' }
  },
  {
    key: 'email',
    label: '邮箱',
    type: 'input',
    placeholder: '请输入邮箱',
    rules: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
  },
  {
    key: 'phone',
    label: '手机号码',
    type: 'input',
    placeholder: '请输入手机号码',
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号码格式不正确', trigger: 'blur' }]
  },
  {
    key: 'age',
    label: '年龄',
    type: 'number',
    props: { min: 0, max: 150, controlsPosition: 'right' }
  },
  { key: 'score', label: '评分', type: 'slider', props: { max: 100 } },
  { key: 'level', label: '等级', type: 'rate', props: { max: 5 } },
  {
    key: 'hobby',
    label: '爱好',
    type: 'checkboxgroup',
    options: [
      { label: '阅读', value: 'read' },
      { label: '运动', value: 'sport' },
      { label: '音乐', value: 'music', disabled: true }
    ]
  },
  { key: 'notify', label: '接收通知', type: 'switch', defaultValue: true },
  {
    key: 'birthday',
    label: '生日',
    type: 'date',
    props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择生日' }
  },
  { key: 'tags', label: '标签', type: 'inputTag', props: { placeholder: '回车添加标签' } },
  {
    key: 'auditRemark',
    label: '停用原因',
    type: 'textarea',
    required: true,
    // 联动：状态选中「停用」才渲染（隐藏即不参与校验）
    hidden: (model) => model.status !== '1',
    props: { rows: 3, maxlength: 200, showWordLimit: true, placeholder: '请输入停用原因' }
  },
  {
    key: 'remark',
    label: '备注',
    type: 'textarea',
    props: { rows: 3, maxlength: 200, showWordLimit: true, placeholder: '请输入备注' }
  }
]

const openCreate = (): void => {
  dialogTitle.value = '新增用户'
  formData.value = {}
  // 新增场景把「初始值」也清空，保证点重置回到空表单
  formRef.value?.setInitialModel({})
  dialogVisible.value = true
}

const openEdit = (): void => {
  dialogTitle.value = '编辑用户'
  const record = {
    userId: 1,
    userName: 'admin',
    nickName: '若依',
    deptId: 11,
    status: '1',
    email: 'admin@ruoyi.vip',
    phone: '13800000000',
    age: 28,
    score: 80,
    level: 4,
    hobby: ['read'],
    notify: true,
    birthday: '1996-08-08',
    tags: ['管理员'],
    auditRemark: '长期未登录',
    remark: ''
  }
  formData.value = { ...record }
  // 编辑场景：重置回到回显数据，而不是空表单
  formRef.value?.setInitialModel(record)
  dialogVisible.value = true
}

const handleSubmit = (payload: Record<string, any>): void => {
  submitOutput.value = `submit 事件 payload：\n${JSON.stringify(payload, null, 2)}`
  dialogVisible.value = false
  ElMessage.success('提交成功，数据见页面下方 JSON')
}
</script>
