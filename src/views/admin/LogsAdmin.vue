<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useGlobalStore } from '@/stores/global'
  import LogTail from '@/components/logs/LogTail.vue'
  import LogDownload from '@/components/logs/LogDownload.vue'
  import { LoadingIcon, ListIcon, CogIcon, ChevronUpIcon } from '@/components/icons'

  const globalStore = useGlobalStore()

  // Matches the backend contract (`severity` of /api/admin/logs and /logs/stream).
  const SEVERITIES = [
    { value: 'all', label: 'All (trace and up)' },
    { value: 'debug', label: 'Debug and up' },
    { value: 'info', label: 'Info and up' },
    { value: 'warning', label: 'Warning and up' },
    { value: 'error', label: 'Errors only' },
  ]

  // Settable levels (POST /api/admin/log-level `level`); 'all' is a filter, not a level.
  const LEVELS = ['trace', 'debug', 'info', 'warning', 'error'] as const

  // fdx-api is split so the noisy reader driver (rfid_core) can be tuned apart from the app loggers.
  interface LevelTarget {
    key: string        // unique row key + level-choice key
    label: string
    service: string    // backend `service`
    modules: string[]  // backend `module`s to set (one request each)
  }
  const LEVEL_TARGETS: LevelTarget[] = [
    { key: 'fdx-hs', label: 'HS main application', service: 'fdx-hs', modules: ['all'] },
    { key: 'fdx-api-app', label: 'RFID API service (app)', service: 'fdx-api', modules: ['service', 'cmd_handler'] },
    { key: 'fdx-api-reader', label: 'RFID API reader (driver)', service: 'fdx-api', modules: ['rfid_core'] },
  ]

  const password = ref('')
  const severity = ref('all')
  const unlocked = computed(() => password.value.length > 0)

  // Write-only: there is no read-back of the current level yet, so choices start at a neutral default.
  const levelChoice = ref<Record<string, string>>(
    LEVEL_TARGETS.reduce((acc, t) => ((acc[t.key] = 'info'), acc), {} as Record<string, string>),
  )
  const levelBusy = ref<string | null>(null)
  const showLevels = ref(false)

  async function applyLevel(target: LevelTarget): Promise<void> {
    if (!unlocked.value || levelBusy.value) return
    levelBusy.value = target.key
    const level = levelChoice.value[target.key]
    try {
      // One request per module; stop on the first failure (the store already notified).
      for (const module of target.modules) {
        const ok = await globalStore.setLogLevel(target.service, level, password.value, module)
        if (!ok) return
      }
      globalStore.notify(`${target.label}: log level set to ${level}`, 'success')
    } finally {
      levelBusy.value = null
    }
  }
</script>

<template>
  <section class="antialiased">
    <div class="mx-auto max-w-7xl">

      <header class="mb-3 flex items-center gap-3">
        <ListIcon class="h-6 w-6 shrink-0 text-brand" />
        <h1 class="text-lg font-semibold tracking-wide text-ink">Log console</h1>
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold"
          :class="unlocked ? 'text-ok' : 'text-ink-faint'">
          <span class="h-1.5 w-1.5 rounded-full" :class="unlocked ? 'bg-ok' : 'bg-idle'" />
          {{ unlocked ? 'Unlocked' : 'Locked' }}
        </span>
      </header>

      <!-- Shared by the live view and the downloads. -->
      <div class="card mb-4 grid gap-3 p-4 sm:grid-cols-2 md:px-6">
        <div>
          <label class="field-label !text-accent" for="log-password">Admin password</label>
          <input id="log-password" type="password" v-model="password" class="input !border-accent/40"
            placeholder="Required for logs" autocomplete="off">
        </div>
        <div>
          <label class="field-label" for="log-severity">Minimum severity</label>
          <select id="log-severity" v-model="severity" class="input">
            <option v-for="s in SEVERITIES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
      </div>

      <LogTail :password="password" :severity="severity" />
      <LogDownload :password="password" :severity="severity" />

      <!-- Runtime log level: rare task, folded by default. Session-only, resets on service restart. -->
      <div class="card mb-4 overflow-hidden">
        <button type="button" class="panel-head w-full text-left" :aria-expanded="showLevels"
          @click="showLevels = !showLevels">
          <h3 class="flex items-center gap-2"><CogIcon class="h-4 w-4 text-brand" /> Runtime level</h3>
          <ChevronUpIcon class="h-5 w-5 text-ink-soft" :class="{ 'rotate-180': !showLevels }" />
        </button>
        <div v-if="showLevels" class="space-y-2 p-4">
          <p class="text-xs text-ink-faint">
            Applies until the service restarts, then it goes back to its default level.
          </p>
          <div v-for="target in LEVEL_TARGETS" :key="'lvl-' + target.key"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel-soft px-3 py-2.5">
            <p class="min-w-[12rem] flex-1 truncate text-sm font-medium text-ink">{{ target.label }}</p>
            <select v-model="levelChoice[target.key]" class="input !w-auto !py-1.5" :aria-label="`Level for ${target.label}`">
              <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
            </select>
            <button type="button" class="btn-ghost shrink-0"
              :disabled="!unlocked || !!levelBusy"
              @click="applyLevel(target)">
              <LoadingIcon v-if="levelBusy === target.key" class="h-4 w-4 animate-spin fill-transparent" />
              <span v-else>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
