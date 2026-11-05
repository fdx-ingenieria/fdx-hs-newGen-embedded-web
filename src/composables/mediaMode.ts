import { readonly, ref } from 'vue'

// Same rule as the Tailwind `mobile:` variant; one shared listener for the whole app.
const query = window.matchMedia('(max-width: 767px), (pointer: coarse)')
const mobile = ref(query.matches)
query.addEventListener('change', e => { mobile.value = e.matches })

export const useIsMobile = () => readonly(mobile)
