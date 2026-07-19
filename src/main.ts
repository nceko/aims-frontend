import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUiStore } from '@/stores/ui.store'
import './assets/styles/main.scss'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
useUiStore(pinia)
app.use(router)
app.mount('#app')
