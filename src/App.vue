<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import ThreeCanvas from './views/ThreeCanvas.vue'
import Home from './views/HomeView.vue'
import TopNav from './components/TopNav.vue'
import { eventBus } from '@/eventBus'
import { ref } from 'vue'

const sceneIsReady = ref<Boolean | null>(null)
const sceneReady = (isReady:boolean) => {
  // alert("SCENE READY")
  sceneIsReady.value = true
}
eventBus.on('sceneReady', sceneReady)
</script>

<template>
  <div 
  v-if="!sceneIsReady"
  class="loader">. . .</div>
  <div class="cst--app">
    <ThreeCanvas />
    <!-- <CutOut /> -->
    <TopNav />
    <Home />
    <!-- <div v-if="sceneIsReady">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="$route.fullPath" />
        </transition>
      </router-view>
    </div> -->
    <div id="footer">FOOTER</div>
    
  </div>
</template>

<style scoped>
#footer{
  position: relative;
  height: 40vh;
  width: 80vw;
  /* background-color: #d80084; */
  opacity: 0.1;
}
header {
  line-height: 1.5;
  max-height: 100vh;
}
.loader {
  position: absolute;
  top: 50%;
  width: 100%;
  left: 0;
  transform: translateY(-50%);
  text-align: center;
  font-size: 6rem;
  color: #e0e0e0;
}
.logo {
  display: block;
  margin: 0 auto 1.2rem;
}


</style>
