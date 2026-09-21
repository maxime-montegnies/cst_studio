import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

  ; (async () => {
    const app = createApp(App)

    app.use(router)

    await router.isReady()
    app.mount('#cst--app')
  })()