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
    path: "/configuration/system",
    name: "System",
    component: () => import('@/views/configuration/System.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/labels",
    name: "Labels",
    component: () => import('@/views/configuration/Labels.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/sensors",
    name: "Sensors",
    component: () => import('@/views/configuration/Sensors.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/configuration/alarms",
    name: "Alarms",
    component: () => import('@/views/configuration/Alarms.vue'),
    props: true,
    meta: {}
  },
  {
    path: "/modbus",
    name: "Modbus",
    component: () => import('@/views/Modbus.vue'),
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
