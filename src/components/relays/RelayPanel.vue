<script setup lang="ts">
  import { IRelayStatus, RelayKey, SensorQuality } from '@/commons';
  import { useNow } from '@/composables/clock';
  import { useGlobalStore } from '@/stores/global';
  import { storeToRefs } from 'pinia';
  import { computed } from 'vue';

  // Own component so the 1 s tick re-renders this panel only, not the whole Overview.
  const globalStore = useGlobalStore()
  const {
    getRelays, getConfiguredAlarms, getConfiguredSensors, getAppModeIsSwitchgear,
    readerFault, readerConnected, antCount,
  } = storeToRefs(globalStore)
  const now = useNow()

  type Tone = 'alert' | 'ok' | 'idle' | 'unknown'

  // Full class strings so Tailwind's JIT picks them up.
  const LAMP: Record<Tone, string> = {
    alert: 'bg-crit shadow-[0_0_0_3px_rgb(var(--crit)/0.15)]',
    ok: 'bg-ok shadow-[0_0_0_3px_rgb(var(--ok)/0.15)]',
    idle: 'border-[1.5px] border-idle/70',
    unknown: 'border-[1.5px] border-dashed border-idle/50',
  }
  const STATE_TEXT: Record<Tone, string> = {
    alert: 'text-crit',
    ok: 'text-ok',
    idle: 'text-ink',
    unknown: 'text-ink-faint',
  }

  // Board wiring: alarm relays are normally open; the system relay is normally closed and energized while healthy.
  const CONTACT: Record<RelayKey, 'NO' | 'NC'> = { relay_1: 'NO', relay_2: 'NO', system: 'NC' }
  const CONTACT_NAME = { NO: 'Normally open', NC: 'Normally closed' }

  const duration = (s: number): string => {
    if (s < 60) return `${s} s`
    if (s < 3600) return `${Math.floor(s / 60)} min`
    if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
    return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`
  }

  // Physical contact state plus how long it has held, e.g. "closed for 12 min".
  const contactLine = (key: RelayKey, r: IRelayStatus): string => {
    if (r.state === 'unknown') return 'Not driven yet'
    const closed = (r.state === 'on') !== (CONTACT[key] === 'NC')
    const held = r.since ? ` for ${duration(Math.max(0, now.value - r.since))}` : ''
    return `${closed ? 'closed' : 'open'}${held}`
  }

  const alarmsOn = (relay: number): number =>
    getConfiguredAlarms.value.filter(a => a.relay_flag === relay && a.fields.length).length

  // Why the system relay dropped, checked in the order the operator should fix it.
  const systemFaultReason = computed((): string => {
    if (readerFault.value) {
      if (!readerConnected.value) return 'Reader offline'
      return antCount.value === 0 ? 'No antenna' : 'Reader fault'
    }
    const sensors = getConfiguredSensors.value
    const down = sensors.filter(s => !s.data || s.data.quality === SensorQuality.OUT_OF_SERVICE).length
    if (down && down === sensors.length) return 'No sensor reading'
    if (down) return `${down} sensor${down > 1 ? 's' : ''} down`
    return getAppModeIsSwitchgear.value ? 'Cabinet incomplete' : 'Check sensors'
  })

  const alarmRelay = (key: RelayKey, index: number) => {
    const r = getRelays.value[key]
    const n = alarmsOn(index)
    const tone: Tone = r.state === 'on' ? 'alert' : r.state === 'off' ? 'idle' : 'unknown'
    return {
      key,
      name: `Relay ${index}`,
      contact: CONTACT[key],
      tone,
      state: r.state === 'on' ? 'On' : r.state === 'off' ? 'Off' : 'Waiting',
      contactLine: contactLine(key, r),
      detail: n ? `${n} alarm${n > 1 ? 's' : ''}` : 'No alarms',
      hint: n ? `Turns on while any of its ${n} alarm${n > 1 ? 's' : ''} is active` : 'No alarm drives this relay',
    }
  }

  const items = computed(() => {
    const sys = getRelays.value.system
    const sysTone: Tone = sys.state === 'on' ? 'ok' : sys.state === 'off' ? 'alert' : 'unknown'
    return [
      alarmRelay('relay_1', 1),
      alarmRelay('relay_2', 2),
      {
        key: 'system' as RelayKey,
        name: 'System',
        contact: CONTACT.system,
        tone: sysTone,
        state: sys.state === 'on' ? 'OK' : sys.state === 'off' ? 'Fault' : 'Waiting',
        contactLine: contactLine('system', sys),
        detail: sys.state === 'off' ? systemFaultReason.value : sys.state === 'on' ? 'All sensors reading' : 'Sensor health',
        hint: 'On while the reader works and every configured sensor is reading',
      },
    ]
  })
</script>

<template>
  <section class="card mb-4" aria-label="Relays">
    <ul class="grid grid-cols-3 divide-x divide-line">
      <li v-for="item in items" :key="item.key" :title="item.hint" class="min-w-0 px-4 py-3 max-sm:px-2.5">
        <h3 class="field-label mb-1 flex items-baseline gap-1.5">
          <span class="truncate">{{ item.name }}</span>
          <abbr class="font-mono font-normal normal-case tracking-normal text-ink-faint/80 no-underline"
            :title="CONTACT_NAME[item.contact]">{{ item.contact }}</abbr>
        </h3>
        <p class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full transition-colors motion-reduce:transition-none"
            :class="LAMP[item.tone]" aria-hidden="true"></span>
          <span class="text-sm font-semibold" :class="STATE_TEXT[item.tone]">{{ item.state }}</span>
        </p>
        <p class="truncate text-xs text-ink-soft first-letter:uppercase">
          <span v-if="item.tone !== 'unknown'" class="max-md:hidden">Contact </span>{{ item.contactLine }}
        </p>
        <p class="truncate text-xs" :class="item.tone === 'alert' && item.key === 'system' ? 'text-crit' : 'text-ink-faint'">{{ item.detail }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped></style>
