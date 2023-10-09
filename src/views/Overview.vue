<script setup lang="ts">
  // import { useGlobalStore } from '@/stores/global'
  // import { onMounted } from 'vue'

  // const globalStore = useGlobalStore()
  // onMounted(() => {
  //   globalStore.connect()
  // })
</script>

<template>
 <div class="antialiased bg-gray-50">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div class="border-2 border-dashed border-gray-300 rounded-lg h-fit">

        <div role="status" class="flex items-center justify-center h-56 max-w-sm bg-gray-300 rounded-lg animate-pulse">
          <svg class="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.2,11.2C8.97,11.2 10.4,12.63 10.4,14.4C10.4,16.17 8.97,17.6 7.2,17.6C5.43,17.6 4,16.17 4,14.4C4,12.63 5.43,11.2 7.2,11.2M14.8,16A2,2 0 0,1 16.8,18A2,2 0 0,1 14.8,20A2,2 0 0,1 12.8,18A2,2 0 0,1 14.8,16M15.2,4A4.8,4.8 0 0,1 20,8.8C20,11.45 17.85,13.6 15.2,13.6A4.8,4.8 0 0,1 10.4,8.8C10.4,6.15 12.55,4 15.2,4Z" />
          </svg>
          <span class="sr-only">Loading...</span>
        </div>

      </div>
      <div class="border-2 border-dashed rounded-lg border-gray-300 h-fit">

        <div role="status" class="flex items-center justify-center h-56 max-w-sm bg-gray-300 rounded-lg animate-pulse">
          <svg class="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.2,11.2C8.97,11.2 10.4,12.63 10.4,14.4C10.4,16.17 8.97,17.6 7.2,17.6C5.43,17.6 4,16.17 4,14.4C4,12.63 5.43,11.2 7.2,11.2M14.8,16A2,2 0 0,1 16.8,18A2,2 0 0,1 14.8,20A2,2 0 0,1 12.8,18A2,2 0 0,1 14.8,16M15.2,4A4.8,4.8 0 0,1 20,8.8C20,11.45 17.85,13.6 15.2,13.6A4.8,4.8 0 0,1 10.4,8.8C10.4,6.15 12.55,4 15.2,4Z" />
          </svg>
          <span class="sr-only">Loading...</span>
        </div>

      </div>
      <div class="border-2 border-dashed rounded-lg border-gray-300 h-fit">

        <div role="status" class="flex items-center justify-center h-56 max-w-sm bg-gray-300 rounded-lg animate-pulse">
          <svg class="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.2,11.2C8.97,11.2 10.4,12.63 10.4,14.4C10.4,16.17 8.97,17.6 7.2,17.6C5.43,17.6 4,16.17 4,14.4C4,12.63 5.43,11.2 7.2,11.2M14.8,16A2,2 0 0,1 16.8,18A2,2 0 0,1 14.8,20A2,2 0 0,1 12.8,18A2,2 0 0,1 14.8,16M15.2,4A4.8,4.8 0 0,1 20,8.8C20,11.45 17.85,13.6 15.2,13.6A4.8,4.8 0 0,1 10.4,8.8C10.4,6.15 12.55,4 15.2,4Z" />
          </svg>
          <span class="sr-only">Loading...</span>
        </div>

      </div>
      <div class="border-2 border-dashed rounded-lg border-gray-300 h-fit">

        <div role="status" class="flex items-center justify-center h-56 max-w-sm bg-gray-300 rounded-lg animate-pulse">
          <svg class="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.2,11.2C8.97,11.2 10.4,12.63 10.4,14.4C10.4,16.17 8.97,17.6 7.2,17.6C5.43,17.6 4,16.17 4,14.4C4,12.63 5.43,11.2 7.2,11.2M14.8,16A2,2 0 0,1 16.8,18A2,2 0 0,1 14.8,20A2,2 0 0,1 12.8,18A2,2 0 0,1 14.8,16M15.2,4A4.8,4.8 0 0,1 20,8.8C20,11.45 17.85,13.6 15.2,13.6A4.8,4.8 0 0,1 10.4,8.8C10.4,6.15 12.55,4 15.2,4Z" />
          </svg>
          <span class="sr-only">Loading...</span>
        </div>

      </div>
    </div>
    <div class="border-2 border-dashed rounded-lg border-gray-300 mb-4">

      <div role="status" class="w-full p-4 space-y-4 border border-gray-200 divide-y divide-gray-200 rounded shadow animate-pulse md:p-6">
          <div class="flex items-center justify-between">
              <div>
                  <div class="h-2.5 bg-gray-300 rounded-full w-24 mb-2.5"></div>
                  <div class="w-32 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <div class="h-2.5 bg-gray-300 rounded-full w-12"></div>
          </div>
          <div class="flex items-center justify-between pt-4">
              <div>
                  <div class="h-2.5 bg-gray-300 rounded-full w-24 mb-2.5"></div>
                  <div class="w-32 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <div class="h-2.5 bg-gray-300 rounded-full w-12"></div>
          </div>
          <div class="flex items-center justify-between pt-4">
              <div>
                  <div class="h-2.5 bg-gray-300 rounded-full w-24 mb-2.5"></div>
                  <div class="w-32 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <div class="h-2.5 bg-gray-300 rounded-full w-12"></div>
          </div>
          <div class="flex items-center justify-between pt-4">
              <div>
                  <div class="h-2.5 bg-gray-300 rounded-full w-24 mb-2.5"></div>
                  <div class="w-32 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <div class="h-2.5 bg-gray-300 rounded-full w-12"></div>
          </div>
          <div class="flex items-center justify-between pt-4">
              <div>
                  <div class="h-2.5 bg-gray-300 rounded-full w-24 mb-2.5"></div>
                  <div class="w-32 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <div class="h-2.5 bg-gray-300 rounded-full w-12"></div>
          </div>
          <span class="sr-only">Loading...</span>
      </div>

    </div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="border-2 border-dashed rounded-lg border-gray-300 h-fit">

        <div role="status" class="w-full p-4 border border-gray-200 rounded shadow animate-pulse md:p-6">
          <div class="h-2.5 bg-gray-200 rounded-full w-20 md:w-32 mb-2.5"></div>
          <div class="w-32 md:w-48 h-2 mb-10 bg-gray-200 rounded-full"></div>
          <div class="flex items-baseline mt-4 space-x-2  md:space-x-6">
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-40"></div>
              <div class="w-full min-w-[8px] h-24 bg-gray-200 rounded-t-lg"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-48"></div>
              <div class="w-full min-w-[8px] h-32 bg-gray-200 rounded-t-lg"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-48"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-40"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-48"></div>
          </div>
          <span class="sr-only">Loading...</span>
        </div>

      </div>
      <div class="border-2 border-dashed rounded-lg border-gray-300 h-fit">
        <div role="status" class="w-full p-4 border border-gray-200 rounded shadow animate-pulse md:p-6">
          <div class="h-2.5 bg-gray-200 rounded-full w-20 md:w-32 mb-2.5"></div>
          <div class="w-32 md:w-48 h-2 mb-10 bg-gray-200 rounded-full"></div>
          <div class="flex items-baseline mt-4 space-x-2  md:space-x-6">
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-40"></div>
              <div class="w-full min-w-[8px] h-24 bg-gray-200 rounded-t-lg"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-48"></div>
              <div class="w-full min-w-[8px] h-32 bg-gray-200 rounded-t-lg"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-48"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-40"></div>
              <div class="w-full min-w-[8px] bg-gray-200 rounded-t-lg h-48"></div>
          </div>
          <span class="sr-only">Loading...</span>
        </div>
      </div>
      <div
        class="border-2 border-dashed rounded-lg border-gray-300 h-48 md:h-72"
      ></div>
      <div
        class="border-2 border-dashed rounded-lg border-gray-300 h-48 md:h-72"
      ></div>
    </div>
    <div
      class="border-2 border-dashed rounded-lg border-gray-300 h-96 mb-4"
    ></div>
    <div class="grid grid-cols-2 gap-4">
      <div
        class="border-2 border-dashed rounded-lg border-gray-300 h-48 md:h-72"
      ></div>
      <div
        class="border-2 border-dashed rounded-lg border-gray-300 h-48 md:h-72"
      ></div>
      <div
        class="border-2 border-dashed rounded-lg border-gray-300 h-48 md:h-72"
      ></div>
      <div
        class="border-2 border-dashed rounded-lg border-gray-300 h-48 md:h-72"
      ></div>
    </div>
  </div>
</template>

<style scoped></style>
