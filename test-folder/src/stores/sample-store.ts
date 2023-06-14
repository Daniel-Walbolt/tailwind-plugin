import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useSampleStore = defineStore('sample-store', {
  state: () => {
    return {
      count: 0 as number,
    }
  },
  actions: {
    increment() {
      this.count++;
    }
  }
})
