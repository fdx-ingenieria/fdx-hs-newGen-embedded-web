import { createWebHistory, createRouter, RouteRecordRaw } from "vue-router"
import PageNotFound from '@/views/PageNotFound.vue'

const routes: Array<RouteRecordRaw > = [
  {
    path: "",
    name: "Overview",
    component: () => import('@/views/Overview.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/temperatures",
    name: "Temperatures",
    component: () => import('@/views/Temperatures.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/system",
    name: "System",
    component: () => import('@/views/System.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/labels",
    name: "Labels",
    component: () => import('@/views/Labels.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/sensors",
    name: "Sensors",
    component: () => import('@/views/Sensors.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/alarms",
    name: "Alarms",
    component: () => import('@/views/Alarms.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/:catchAll(.*)",
    component: PageNotFound
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
