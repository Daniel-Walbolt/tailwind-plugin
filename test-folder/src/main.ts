import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import './index.css'
import { loadAppVueComponents } from './components'

const app = createApp(App)
//^?

loadAppVueComponents(app);

app.use(createPinia())
app.use(router)

app.mount('#app')
