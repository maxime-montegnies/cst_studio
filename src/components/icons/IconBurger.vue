<script setup lang="ts">

import { ref, watch, onMounted } from "vue";
import { eventBus } from "@/eventBus";

defineProps<{
  active: boolean
}>()

onMounted(() => {
   
})
</script>
<template>
   <svg :class="{ 'opened': active }" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path class="line-top" d="M4 6L20 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path class="line-mid" d="M4 12L20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path class="line-bot" d="M4 18L20 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
   </svg>
</template>


<style scoped>
path{
   transition:
         opacity var(--transition-burger-speed) ease,
         transform var(--transition-burger-speed) ease;
}
.line-top{
  transform-origin: 14px 6px;
}
.line-bot{
  transform-origin: 14px 18px;
}
.opened{
   .line-top{
      transform: translateY(8px) rotateZ(45deg);
   }
   .line-mid{
      opacity: 0;
      transform:  translateX(12px) scaleX(0);
   }
   .line-bot{
      transform: translateY(-7px) rotateZ(-45deg);
   }
}
</style>