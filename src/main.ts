import { createApp } from 'vue'
import App from './App.vue'
import '@/styles/tailwind.css'
import '@/styles/index.scss'
import { initRouter } from '@/router'
import { initStore } from '@/stores' 

const app = createApp(App)
initStore(app)
initRouter(app)

app.mount('#app')