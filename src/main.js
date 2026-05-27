import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import AlertToastBridge from './components/AlertToastBridge.vue'
import router from './router'
import { notifier } from './utils/notifications'

const app = createApp(App)

app.component('AlertToastBridge', AlertToastBridge)
app.use(createPinia())
app.use(router)
app.use(ui)

let invalidNoticeShownAt = 0

document.addEventListener(
  'invalid',
  (event) => {
    const field = event.target

    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      )
    ) {
      return
    }

    event.preventDefault()

    if (Date.now() - invalidNoticeShownAt < 300) {
      return
    }

    invalidNoticeShownAt = Date.now()
    const label =
      field.closest('label')?.innerText?.trim().split('\n')[0] ||
      field.getAttribute('aria-label') ||
      field.name ||
      field.placeholder ||
      'Field ini'
    const description = field.validity.valueMissing
      ? `${label} wajib diisi.`
      : field.validationMessage

    notifier.warning(description, 'Form Belum Lengkap')
    field.focus()
  },
  true,
)

app.mount('#app')
