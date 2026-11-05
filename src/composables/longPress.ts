import type { ObjectDirective } from 'vue'

// Touch/pen counterpart of the hidden keyboard shortcuts; mouse presses are ignored on purpose.
const HOLD_MS = 1200
const MOVE_TOLERANCE_PX = 10

interface LongPressState {
  timer: number | undefined
  x: number
  y: number
  active: boolean
  handler: () => void
  listeners: Array<[string, EventListener]>
}

type LongPressElement = HTMLElement & { _longPress?: LongPressState }

export const vLongPress: ObjectDirective<LongPressElement, () => void> = {
  mounted(el, binding) {
    const state: LongPressState = { timer: undefined, x: 0, y: 0, active: false, handler: binding.value, listeners: [] }

    const cancel = () => {
      window.clearTimeout(state.timer)
      state.timer = undefined
      state.active = false
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      cancel()
      state.active = true
      state.x = e.clientX
      state.y = e.clientY
      state.timer = window.setTimeout(() => {
        state.active = false
        navigator.vibrate?.(40)
        state.handler()
      }, HOLD_MS)
    }

    const onMove = (e: PointerEvent) => {
      if (!state.active) return
      if (Math.abs(e.clientX - state.x) > MOVE_TOLERANCE_PX || Math.abs(e.clientY - state.y) > MOVE_TOLERANCE_PX) cancel()
    }

    // The browser's own long-press menu would otherwise pop up over the element.
    const onContextMenu = (e: Event) => {
      if (state.active || state.timer !== undefined) e.preventDefault()
    }

    state.listeners = [
      ['pointerdown', onDown as EventListener],
      ['pointermove', onMove as EventListener],
      ['pointerup', cancel],
      ['pointercancel', cancel],
      ['pointerleave', cancel],
      ['contextmenu', onContextMenu],
    ]
    state.listeners.forEach(([type, fn]) => el.addEventListener(type, fn))
    el._longPress = state
  },
  updated(el, binding) {
    if (el._longPress) el._longPress.handler = binding.value
  },
  beforeUnmount(el) {
    const state = el._longPress
    if (!state) return
    window.clearTimeout(state.timer)
    state.listeners.forEach(([type, fn]) => el.removeEventListener(type, fn))
    delete el._longPress
  },
}
