import { createWebHistory, createRouter, RouteRecordRaw } from "vue-router"
import PageNotFound from '@/views/PageNotFound.vue'
import Overview from '@/views/Overview.vue'
import System from '@/views/configuration/System.vue'
import Labels from '@/views/configuration/Labels.vue'
import Sensors from '@/views/configuration/Sensors.vue'
import Alarms from '@/views/configuration/Alarms.vue'
import Modbus from '@/views/Modbus.vue'

/**
 * DONT USE LAZY LOADING FOR ROUTES
 * it's has an unexpected behavior on the board
 */
const routes: Array<RouteRecordRaw > = [
  {
    path: "",
    name: "Overview",
    component: Overview,
    props: true,
    meta: {}
  },
  {
    path: "/configuration/system",
    name: "System",
    component: System,
    props: true,
    meta: {}
  },
  {
    path: "/configuration/labels",
    name: "Labels",
    component: Labels,
    props: true,
    meta: {}
  },
  {
    path: "/configuration/sensors",
    name: "Sensors",
    component: Sensors,
    props: true,
    meta: {}
  },
  {
    path: "/configuration/alarms",
    name: "Alarms",
    component: Alarms,
    props: true,
    meta: {}
  },
  {
    path: "/modbus",
    name: "Modbus",
    component: Modbus,
    props: true,
    meta: {}
  },
  {
    path: "/:catchAll(.*)",
    component: PageNotFound
  }
];

const router = createRouter({
  history: createWebHistory('#/'),
  routes,
});

export default router;
