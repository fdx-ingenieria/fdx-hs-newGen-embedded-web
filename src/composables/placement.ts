import { computed, ref, watch, type Ref } from 'vue'
import { ISensor } from '@/commons'
import { useGlobalStore } from '@/stores/global'

// Bulk tag placement shared by Quick setup and Installation: pick an equipment, tap a tag to drop it
// into the highlighted location x position cell (the cursor jumps to the next empty one), and save
// every placement at once. Placements stay pending, and can be taken back, until saved.
export function usePlacement(configured: Ref<ISensor[]>, placeableIds: Ref<string[]>, max: number) {
  const globalStore = useGlobalStore()

  const options = (list: string[] | undefined) =>
    (list ?? []).map((label, index) => ({ label, index })).filter(o => o.index > 0 && !!o.label)
  const equipments = computed(() => options(globalStore.getAvailableLabels.equipment))
  const locations = computed(() => options(globalStore.getAvailableLabels.location))
  const positions = computed(() => options(globalStore.getAvailableLabels.position))

  const equipment = ref(equipments.value[0]?.index ?? 0)
  // Pending placements per equipment (equipment -> cell key -> tag id), kept across equipment switches.
  const assignments = ref<Record<number, Record<string, string>>>({})
  const assigned = computed(() => assignments.value[equipment.value] ?? {})
  const cursor = ref<string | null>(null)

  const key = (location: number, position: number) => `${location}-${position}`
  const cells = computed(() => locations.value.flatMap(l => positions.value.map(p => key(l.index, p.index))))

  // Cells already holding a configured sensor of this equipment: shown, never overwritten here.
  const taken = computed(() => {
    const map: Record<string, ISensor> = {}
    configured.value
      .filter(s => s.config.equipment === equipment.value)
      .forEach(s => { map[key(s.config.location, s.config.position)] = s })
    return map
  })

  const isFree = (cell: string) => !taken.value[cell] && !assigned.value[cell]
  const nextFree = (from: string | null): string | null => {
    const list = cells.value
    const start = from ? list.indexOf(from) + 1 : 0
    return list.slice(start).find(isFree) ?? list.find(isFree) ?? null
  }

  // Labels can change underneath (another client, a preset): fall back to the first equipment.
  watch(equipments, list => {
    if (!list.some(e => e.index === equipment.value)) equipment.value = list[0]?.index ?? 0
  }, { immediate: true })

  // Drop placements whose tag can no longer be placed (cleared, or configured elsewhere).
  watch(() => placeableIds.value.join(','), () => {
    const alive = new Set(placeableIds.value)
    let changed = false
    const next: Record<number, Record<string, string>> = {}
    for (const eq of Object.keys(assignments.value).map(Number)) {
      next[eq] = {}
      for (const [cell, id] of Object.entries(assignments.value[eq])) {
        if (alive.has(id)) next[eq][cell] = id
        else changed = true
      }
    }
    if (changed) {
      assignments.value = next
      if (!cursor.value || !isFree(cursor.value)) cursor.value = nextFree(null)
    }
  })

  // Switching equipment keeps its placements; the cursor goes to its first empty cell.
  watch(equipment, () => { cursor.value = nextFree(null) }, { immediate: true })
  // A sensor saved or removed underneath moves the cursor off a cell that is no longer free.
  watch(taken, () => { if (!cursor.value || !isFree(cursor.value)) cursor.value = nextFree(cursor.value) })

  const setAssigned = (next: Record<string, string>) => {
    assignments.value = { ...assignments.value, [equipment.value]: next }
  }
  const pendingFor = (eq: number) => Object.keys(assignments.value[eq] ?? {}).length
  const pending = computed(() => Object.keys(assignments.value).reduce((n, eq) => n + pendingFor(Number(eq)), 0))
  const assignedIds = computed(() => new Set(Object.values(assignments.value).flatMap(c => Object.values(c))))
  const room = computed(() => max - configured.value.length)

  function place(cell: string | null, id: string): void {
    if (!cell || taken.value[cell]) return
    if (!assigned.value[cell] && pending.value >= room.value) {
      globalStore.notify(`Sensor limit reached (${max})`, 'warning')
      return
    }
    setAssigned({ ...assigned.value, [cell]: id })
    cursor.value = nextFree(cell)
  }

  function unassign(cell: string): void {
    const next = { ...assigned.value }
    delete next[cell]
    setAssigned(next)
    cursor.value = cell
  }

  function selectCell(cell: string): void {
    if (taken.value[cell]) return
    cursor.value = cell
  }

  function discard(): void {
    assignments.value = {}
    cursor.value = nextFree(null)
  }

  // Saves every pending placement in one request; `nameOf` gives the display name of a tag id.
  async function save(nameOf: (id: string) => string): Promise<void> {
    const list: ISensor[] = []
    for (const eq of Object.keys(assignments.value).map(Number)) {
      const byCell = assignments.value[eq]
      for (const cell of Object.keys(byCell)) {
        const [location, position] = cell.split('-').map(Number)
        list.push({ id: byCell[cell], EPC: nameOf(byCell[cell]), config: { equipment: eq, location, position } })
      }
    }
    if (!list.length) return
    await globalStore.updateSensors(list)
    assignments.value = {}
    cursor.value = nextFree(null)
  }

  return {
    equipments, locations, positions, equipment, cells, key, cursor,
    taken, assigned, isFree, place, unassign, selectCell,
    pending, pendingFor, assignedIds, discard, save,
  }
}
