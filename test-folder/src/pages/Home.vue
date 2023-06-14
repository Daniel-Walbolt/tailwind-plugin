<script setup lang="ts">
import { useSampleStore } from '@/stores/sample-store';

const sampleStore = useSampleStore();
</script>

<template>
  <FullPageLayout>
    <div class="flex flex-col items-center">
      <h1 class="w-full p-20 text-center font-bold text-2xl">
        This is the beginning of something great.
      </h1>
      <p class="text-xl p-2">{{ sampleStore.count }}</p>
      <button
        class="border-2 border-black rounded-md p-2 hover:bg-gray-50 active:bg-gray-200 w-fit"
        @click="sampleStore.increment"
      >
        Increment
      </button>
    </div>
  </FullPageLayout>
</template>
