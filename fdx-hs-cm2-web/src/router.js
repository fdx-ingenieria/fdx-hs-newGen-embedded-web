// src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import AlarmView from './views/AlarmView.vue';
import sensor_configView from './views/sensor_configView.vue';
import label_configView from './views/label_configView.vue';
import console_configView from './views/console_configView.vue';

const routes = [
  { path: '/', component: HomeView },
  { path: '/alarm', component: AlarmView },
  { path: '/sensor_config', component: sensor_configView },
  { path: '/label_config', component: label_configView },
  { path: '/console', component: console_configView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
