import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia'

//import BootstrapVueNext from 'bootstrap-vue-next'
import {BootstrapVueNext, BToast } from 'bootstrap-vue-next'


import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

const app = createApp(App);
const pinia = createPinia()
	

app.use(BootstrapVueNext)
app.use(BToast)

app.use(router);
app.use(pinia)

app.mount('#app');
