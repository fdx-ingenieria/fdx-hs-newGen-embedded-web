<script setup lang="ts">
  import { PropType, ref } from 'vue';
  import { IMenuItem } from '@/commons';
  import { ChevronUpIcon } from '@/components/icons';

  defineProps({
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
    }
  })

  const showItems = ref(false);
</script>
<template>
  <template v-if="!items.length">
    <li class="cursor-pointer">
      <button @click="$router.push({ name: route})"
        :disabled="!route"
        class="flex w-full items-center p-2 disabled:opacity-50 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-100 group">
        <slot></slot>
        <span class="ml-3">{{ label }}</span>
      </button>
    </li>
  </template>
  <template v-else>
    <li class="cursor-pointer">
      <button type="button"
        @click="showItems = !showItems"
        class="flex items-center p-2 w-full text-base font-medium text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100"
        aria-controls="dropdown-authentication" data-collapse-toggle="dropdown-authentication">
        <slot></slot>
        <span class="flex-1 ml-3 text-left whitespace-nowrap">{{ label }}</span>
        <ChevronUpIcon class="w-7"/>
      </button>
      <ul class="py-2 space-y-2" :class="{'hidden': !showItems}">
        <li v-for="item in items">
          <button @click="$router.push({ name: item.route})"
            :disabled="!item.route"
            class="flex items-center disabled:opacity-50 p-2 pl-11 w-full text-base font-medium text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100">
            {{ item.label }}
          </button>
        </li>
      </ul>
    </li>
  </template>
</template>

<style scoped></style>
