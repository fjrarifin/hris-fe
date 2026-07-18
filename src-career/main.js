import { createApp } from 'vue'
import CareerApp from './CareerApp.vue'
import router from './router'
import './assets/career.css'

createApp(CareerApp).use(router).mount('#career-app')
