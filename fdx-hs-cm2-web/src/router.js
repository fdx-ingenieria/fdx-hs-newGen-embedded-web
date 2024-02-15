// src/router.js
import { createRouter, createWebHistory } from 'vue-router';

import console_configView from './views/console_configView.vue';

const routes = [
  { path: '/', component: console_configView },
  // { path: '/alarm', component: AlarmView },
  // { path: '/sensor_config', component: sensor_configView },
  // { path: '/label_config', component: label_configView },
  // { path: '/console', component: console_configView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
