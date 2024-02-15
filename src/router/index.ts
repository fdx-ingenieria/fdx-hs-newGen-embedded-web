import { createWebHistory, createRouter, RouteRecordRaw } from "vue-router"
import PageNotFound from '@/views/PageNotFound.vue'
import Home from '@/views/Home.vue'
import Command from '@/views/Command.vue'
import Wired from '@/views/configuration/Wired.vue'
import Wireless from '@/views/configuration/Wireless.vue'
import Reader from '@/views/configuration/Reader.vue'

/**
 * DONT USE LAZY LOADING FOR ROUTES
 * it's has an unexpected behavior on the board
 */
const routes: Array<RouteRecordRaw > = [
  {
    path: "",
    name: "Home",
    component: Home,
    props: true,
    meta: {}
  },
  {
    path: "/Network/Wireless",
    name: "Wireless",
    component: Wireless,
    props: true,
    meta: {}
  },
  {
    path: "/Network/Wired",
    name: "Wired",
    component: Wired,
    props: true,
    meta: {}
  },

  {
    path: "/Reader",
    name: "Reader",
    component: Reader,
    props: true,
    meta: {}
  },

  {
    path: "/command",
    name: "Command",
    component: Command,
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
