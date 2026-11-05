<script setup lang="ts">
  import { ref } from 'vue'
  import { useGlobalStore } from '@/stores/global'
  import { LoadingIcon, PrintIcon } from '@/components/icons'

  const props = defineProps({
    password: { type: String, required: true },
    severity: { type: String, required: true },
  })

  const globalStore = useGlobalStore()

  const SOURCES = [
    { key: 'all', label: 'All services, merged by time' },
    { key: 'fdx-hs', label: 'HS main application' },
    { key: 'fdx-api', label: 'RFID API service' },
    { key: 'fdx-wifi-service', label: 'WiFi service' },
  ]
  // Seconds back from the device clock; 0 = the whole current log file.
  const RANGES = [
    { seconds: 300, label: 'Last 5 minutes' },
    { seconds: 900, label: 'Last 15 minutes' },
    { seconds: 1800, label: 'Last 30 minutes' },
    { seconds: 3600, label: 'Last hour' },
    { seconds: 7200, label: 'Last 2 hours' },
    { seconds: 0, label: 'Whole current log' },
  ]

  const service = ref('all')
  const rangeSeconds = ref(900)
  const checking = ref(false)
  const form = ref<HTMLFormElement | null>(null)

  async function download(): Promise<void> {
    if (!props.password || checking.value) return
    checking.value = true
    try {
      const ok = await globalStore.checkLogDownload(service.value, props.severity, rangeSeconds.value, props.password)
      if (!ok) return
      // Native form post: the browser streams the attachment straight to disk.
      form.value?.submit()
      globalStore.notify('Log download started', 'success')
    } finally {
      checking.value = false
    }
  }
</script>

<template>
  <div class="card mb-4 overflow-hidden">
    <div class="panel-head">
      <h3 class="flex items-center gap-2"><PrintIcon class="h-4 w-4 text-brand" /> Download</h3>
    </div>
    <div class="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end md:px-6">
      <div>
        <label class="field-label" for="log-dl-source">Source</label>
        <select id="log-dl-source" v-model="service" class="input">
          <option v-for="s in SOURCES" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="log-dl-range">Time range</label>
        <select id="log-dl-range" v-model.number="rangeSeconds" class="input">
          <option v-for="r in RANGES" :key="r.seconds" :value="r.seconds">{{ r.label }}</option>
        </select>
      </div>
      <button type="button" class="btn-primary h-[2.6rem] [@media(pointer:coarse)]:h-12"
        :disabled="!password || checking" @click="download">
        <LoadingIcon v-if="checking" class="h-4 w-4 animate-spin fill-transparent" />
        Download log
      </button>
      <p class="text-xs text-ink-faint sm:col-span-3">
        Uses the minimum severity selected above. Times are measured with the device clock; the file keeps the original log format.
      </p>
    </div>

    <form ref="form" method="POST" action="/api/admin/logs" target="log-download-frame" class="hidden">
      <input type="hidden" name="service" :value="service">
      <input type="hidden" name="severity" :value="severity">
      <input type="hidden" name="range_s" :value="rangeSeconds">
      <input type="hidden" name="password" :value="password">
    </form>
    <iframe name="log-download-frame" class="hidden" title="Log download" tabindex="-1" aria-hidden="true"></iframe>
  </div>
</template>

<style scoped></style>
