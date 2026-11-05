import { readonly, ref } from 'vue'

// One shared 1 s tick (unix seconds) for every "N s ago" label, started on first use.
const now = ref(Math.floor(Date.now() / 1000))
let started = false

export function useNow() {
  if (!started) {
    started = true
    setInterval(() => { now.value = Math.floor(Date.now() / 1000) }, 1000)
  }
  return readonly(now)
}
