import { computed } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { BookmarkIcon, CabinetIcon, SearchIcon, WrenchIcon } from '@/components/icons'

// One effective mode, matching the branch the backend measuring loop takes: Installation wins, then Discovery, then Auto.
export function useDeviceMode() {
  const globalStore = useGlobalStore()
  return computed(() => {
    if (globalStore.getInstallActive) {
      return { icon: WrenchIcon, label: 'Installation mode', colorClass: 'text-warn/70', title: 'Installation mode: measuring, alarms and Modbus are paused' }
    }
    if (globalStore.getDiscoveryModeOn) {
      return { icon: SearchIcon, label: 'Discovery mode', colorClass: 'text-warn/70', title: 'Discovery mode: all detected tags are processed' }
    }
    if (globalStore.getAppModeIsSwitchgear) {
      return { icon: CabinetIcon, label: 'Auto mode', colorClass: 'text-accent/70', title: 'Auto mode: sensor groups are auto-registered and tracked per antenna (switchgear)' }
    }
    return { icon: BookmarkIcon, label: 'Manual mode', colorClass: 'text-ok/70', title: 'Manual mode: only registered sensors are processed' }
  })
}
