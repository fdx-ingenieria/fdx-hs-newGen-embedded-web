<script setup lang="ts">
  import { PropType, ref } from 'vue';
  import { IMenuItem } from '@/commons';
  import { ChevronUpIcon } from '@/components/icons';
  import { RouteLocationMatched } from 'vue-router';

  const props = defineProps({
    label: {
      type: String,
      required: true
    },
    route: {
      type: String,
      default: ''
    },
    items: {
      type: Array as PropType<IMenuItem[]>,
      default: () => []
    },
    matched: {
      type: Array<RouteLocationMatched>,
      default: () => []
    }
  })

  const isActive = (name: string | undefined): boolean => {
    if (!name) return false;

    return props.matched?.some((item) => item.name === name);
  };

  const showItems = ref(false);
</script>
<template>
  <template v-if="!items.length">
    <li class="cursor-pointer">
      <button @click="$router.push({ name: route})"
        :disabled="!route"
        class="group flex w-full items-center rounded-lg p-2.5 text-sm font-medium text-ink-soft hover:bg-panel-strong hover:text-ink disabled:opacity-50"
        :class="{'!bg-brand-soft !text-brand font-semibold': isActive(route)}">
        <slot></slot>
        <span class="ml-3">{{ label }}</span>
      </button>
    </li>
  </template>
  <template v-else>
    <li class="cursor-pointer">
      <button type="button"
        @click="showItems = !showItems"
        class="group flex w-full items-center rounded-lg p-2.5 text-sm font-medium text-ink-soft hover:bg-panel-strong hover:text-ink"
        :class="{'!text-brand': isActive(route)}">
        <slot></slot>
        <span class="flex-1 ml-3 text-left whitespace-nowrap">{{ label }}</span>
        <ChevronUpIcon class="w-5 text-ink-faint" :class="{'rotate-180': !showItems}"/>
      </button>
      <ul class="mt-1 space-y-1 border-l border-line pl-3" :class="{'hidden': !showItems}">
        <li v-for="item in items">
          <button @click="$router.push({ name: item.route})"
            :disabled="!item.route"
            class="group flex w-full items-center rounded-lg p-2 pl-6 text-sm font-medium text-ink-soft hover:bg-panel-strong hover:text-ink disabled:opacity-50"
            :class="{'!bg-brand-soft !text-brand font-semibold': isActive(item.route)}">
            {{ item.label }}
          </button>
        </li>
      </ul>
    </li>
  </template>
</template>

<style scoped></style>
