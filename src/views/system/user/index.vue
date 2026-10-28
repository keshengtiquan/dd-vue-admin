<template>
  <section class="user-page">
    <div class="search-card">
      <SearchBar :fields="searchFields" :model="query" :loading="loading" @search="search" @reset="reset" />
    </div>
    <a-card class="table-card" title="用户管理" :bordered="false">
      <a-table
        class="user-table mt-5"
        row-key="userId"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 900, y: 'calc(100vh - 330px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '0' ? 'green' : 'default'">
              {{ record.status === '0' ? '正常' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'userType'">
            {{ record.userType === '00' ? '系统用户' : '其他用户' }}
          </template>
          <template v-else-if="column.key === 'loginDate'">
            {{ record.loginDate || '—' }}
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="total"
          show-size-changer
          show-quick-jumper
          :show-total="(count: number) => `共 ${count} 条`"
          @change="loadRows"
          @show-size-change="loadRows"
        />
      </div>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { getUserPageApi, type UserPageQuery, type UserRow } from '@/api/system/user'

defineOptions({ name: 'SystemUser' })

const columns = [
  { title: '用户编号', dataIndex: 'userId', key: 'userId', width: 100 },
  { title: '登录账号', dataIndex: 'userName', key: 'userName', width: 140 },
  { title: '用户昵称', dataIndex: 'nickName', key: 'nickName', width: 140 },
  { title: '用户类型', dataIndex: 'userType', key: 'userType', width: 110 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '最后登录 IP', dataIndex: 'loginIp', key: 'loginIp', width: 150 },
  { title: '最后登录时间', dataIndex: 'loginDate', key: 'loginDate', width: 180 }
]

const searchFields = [
  { field: 'userName', label: '登录账号', placeholder: '请输入账号', type: 'input' },
  { field: 'nickName', label: '用户昵称', placeholder: '请输入昵称', type: 'input' },
  {
    field: 'status', label: '状态', type: 'select', placeholder: '全部',
    options: [{ label: '正常', value: '0' }, { label: '停用', value: '1' }]
  }
]

const query = reactive<UserPageQuery>({ pageNum: 1, pageSize: 10, userName: '', nickName: '', status: undefined })
const rows = ref<UserRow[]>([])
const total = ref(0)
const loading = ref(false)

async function loadRows() {
  loading.value = true
  try {
    const result = await getUserPageApi({
      ...query,
      userName: query.userName?.trim() || undefined,
      nickName: query.nickName?.trim() || undefined
    })
    rows.value = result.list || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

function search() {
  query.pageNum = 1
  void loadRows()
}

function reset() {
  query.userName = ''
  query.nickName = ''
  query.status = undefined
  search()
}

onMounted(loadRows)
</script>

<style scoped>
.user-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}
.search-card { flex: none; padding: 16px; background: #fff; border: 0; border-radius: 8px; }
.table-card { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.table-card :deep(.ant-card-body) { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.user-table { flex: 1; min-height: 0; }
.table-pagination { display: flex; flex: none; justify-content: flex-end; margin-top: 12px; }
</style>
