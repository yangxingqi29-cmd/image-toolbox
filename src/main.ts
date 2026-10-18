import { createApp } from 'vue'
import App from '@/app/App.vue'
import { router } from '@/app/router'
import { i18n } from '@/i18n'
import '@/styles/main.css'

createApp(App).use(router).use(i18n).mount('#app')
