import { createRouter, createWebHistory } from 'vue-router'
import CareerHomeView from './views/CareerHomeView.vue'
import CareerVacancyDetailView from './views/CareerVacancyDetailView.vue'
import CareerNotFoundView from './views/CareerNotFoundView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'career-home', component: CareerHomeView },
    { path: '/jobs', name: 'career-jobs', component: CareerHomeView },
    { path: '/jobs/:slug', name: 'career-job-detail', component: CareerVacancyDetailView },
    { path: '/:pathMatch(.*)*', name: 'career-not-found', component: CareerNotFoundView },
  ],
})

export default router
