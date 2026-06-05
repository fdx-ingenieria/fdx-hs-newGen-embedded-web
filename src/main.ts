import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { initTheme } from './composables/theme'

// Sync the reactive theme state with the class the inline <head> script set.
initTheme()

const pinia = createPinia()
  .use(piniaPluginPersistedstate)

createApp(App)
  .use(router)
  .use(pinia)
  .mount('#app')
