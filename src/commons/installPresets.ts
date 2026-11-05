// Field installation presets (EDENOR). Label names are in Spanish on purpose: the app
// defaults stay in English, these only apply when an installer picks them.
import type { ILabelData } from './interfaces'

export type PresetKey = 'bancos' | 'celdas' | 'default'

export interface PresetAlarm {
  name: string
  alarm_type: number     // AlarmType index: 1 absolute, 2 unbalance, 3 dispersion
  set_point: number
  equipment: number      // label index, resolved against the device labels
  location: number
}

interface PresetDef {
  key: PresetKey
  title: string
  summary: string
  labels: ILabelData     // without the reserved index 0
}

const POSITIONS = ['R', 'S', 'T']

// Most used first. 'default' restores the backend factory labels and has no alarm preset.
export const PRESETS: PresetDef[] = [
  {
    key: 'bancos',
    title: 'EDENOR, capacitor banks',
    summary: 'One HS per capacitor bank, 9 sensors per bank. Runs in Manual mode.',
    labels: {
      equipment: ['Banco 1', 'Banco 2', 'Banco 3', 'Banco 4'],
      location: ['Cables', 'Inductor superior', 'Inductor inferior'],
      position: POSITIONS,
    },
  },
  {
    key: 'celdas',
    title: 'EDENOR, switchgear cells',
    summary: 'One HS per switchgear, one transformer per antenna. Runs in Auto (switchgear) mode.',
    labels: {
      equipment: ['Transformador A', 'Transformador B', 'Transformador C'],
      location: ['Interruptor superior', 'Interruptor inferior'],
      position: POSITIONS,
    },
  },
  {
    key: 'default',
    title: 'Factory defaults',
    summary: 'The English labels the device ships with.',
    labels: {
      equipment: ['Transformer A', 'Transformer B', 'Transformer C', 'Transformer D'],
      location: ['Upper Breaker', 'Lower Breaker'],
      position: POSITIONS,
    },
  },
]

export const ALARM_PRESETS = PRESETS.filter(p => p.key !== 'default')

export const presetByKey = (key: PresetKey): PresetDef => PRESETS.find(p => p.key === key)!

// Writes the preset names from slot 1 on and blanks the rest, keeping each list's length.
export function applyLabelPreset(current: ILabelData, key: PresetKey): ILabelData {
  const preset = presetByKey(key).labels
  const fill = (list: string[], names: string[]): string[] => {
    const out = list.length ? list.slice() : ['']
    while (out.length < names.length + 1) out.push('')
    for (let i = 1; i < out.length; i++) out[i] = names[i - 1] ?? ''
    return out
  }
  return {
    equipment: fill(current.equipment, preset.equipment),
    location: fill(current.location, preset.location),
    position: fill(current.position, preset.position),
  }
}

const COMBO = [
  { suffix: 'Abs', alarm_type: 1, set_point: 90 },
  { suffix: 'Disp', alarm_type: 3, set_point: 10 },
  { suffix: 'Desb', alarm_type: 2, set_point: 10 },
]

const SHORT_LOCATION: Record<string, string> = {
  'Interruptor superior': 'Sup',
  'Interruptor inferior': 'Inf',
  'Cables': 'Cables',
  'Inductor superior': 'Ind sup',
  'Inductor inferior': 'Ind inf',
}

/**
 * Alarms of a preset, one absolute/dispersion/unbalance trio per equipment+location pair.
 * Cells cover every transformer; banks cover only bank @p bank (one HS per bank).
 * Returns the names of the labels missing on the device when it cannot resolve them.
 */
export function buildAlarmPreset(labels: ILabelData, key: PresetKey, bank = 1): { alarms: PresetAlarm[], missing: string[] } {
  const preset = presetByKey(key).labels
  const equipments = key === 'celdas' ? preset.equipment : [preset.equipment[bank - 1]]
  const missing: string[] = []
  const indexOf = (list: string[] | undefined, name: string): number => {
    const i = (list ?? []).indexOf(name)
    if (i <= 0 && !missing.includes(name)) missing.push(name)
    return i
  }

  const alarms: PresetAlarm[] = []
  for (const eq of equipments) {
    const equipment = indexOf(labels.equipment, eq)
    const eqShort = key === 'celdas' ? `Trafo ${eq.slice(-1)}` : `B${eq.slice(-1)}`
    for (const loc of preset.location) {
      const location = indexOf(labels.location, loc)
      for (const c of COMBO) {
        alarms.push({ name: `${eqShort} ${SHORT_LOCATION[loc]} ${c.suffix}`, alarm_type: c.alarm_type, set_point: c.set_point, equipment, location })
      }
    }
  }
  return { alarms, missing }
}
