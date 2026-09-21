<script setup lang="ts">
import { t } from "@/strings";
import Burger from "../components/icons/IconBurger.vue";
import Logo from "../components/icons/IconLogo.vue";
import Close from "../components/icons/IconClose.vue";
import { useRouter } from "vue-router";
import { useRoute } from "vue-router";
import { ref, watch, onMounted } from "vue";
import { eventBus } from "@/eventBus";

const router = useRouter();
const route = useRoute();

const isBurgerActive = ref<Boolean>(false);
const showBurger = ref<Boolean>(true);
const showClose = ref<Boolean>(true);
onMounted(() => {
  watch(
    () => route.path,
    (newPath) => {
      if (newPath == "/") {
        // showClose.value = false;
        // showBurger.value = false;
      } else {
        // showClose.value = true;
        // showBurger.value = true;
      }
    },
    { immediate: true },
  );
});

function onCloseClick() {
  if (route.path.includes("/draw")) {
    router.push(`/`);
    setTimeout(() => {
      eventBus.emit("activeExport", false);
    }, 300);
  } else if (route.path.includes("/save")) {
    eventBus.emit("activeExport", false);
    router.push(`/`);
  } else {
    router.push(`/`);
  }
}
function onBurgerClick() {
  isBurgerActive.value = !isBurgerActive.value
  // async function shareLink() {
  //   try {
  //     await navigator.share({
  //       title: t("shareTitle"),
  //       text: t("shareText"),
  //       url: t("shareUrl"),
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
  // shareLink();
}
</script>

<template>
  <header>
    <div>
      <div>
        <transition name="fade">
          <button v-if="showClose" @click="onCloseClick" class="icon-btn">
            <Logo :active=isBurgerActive />
          </button>
        </transition>
      </div>
      <div>
        <transition name="fade">
          <button v-if="showBurger" @click="onBurgerClick" class="icon-btn">
            <Burger :active=isBurgerActive />
          </button>
        </transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
button {
  -webkit-tap-highlight-color: transparent;
}
header {
  position: fixed;
  width: 100%;
  height: 100px;
  padding-left: 20px;
  padding-right: 20px;
  /* backdrop-filter: blur(130px); */
  /* -webkit-backdrop-filter: blur(130px); */
  /* background-color: #080808DD; */
  /*
  mask-image: linear-gradient(
    to bottom,
    black 0%,
    transparent 100%
    );
    
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      transparent 100%
      );
      */

background: linear-gradient(to bottom, #080808FF, #08080800);


  z-index: 10;
  & > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    & > div {
      button {
        display: flex;
        align-items: center;
        justify-content: center;
        /* background-color: red; */
        &>svg{
          
        }
      }
      &:first-child {
        /* transform: translateX(calc(var(--rgi--container-titl-marg) * -0.5)); */
        button {
          &>svg{
            width: 68px;
            height: 68px;
          }
      }
      }

      &:last-child {
        /* transform: translateX(calc(var(--rgi--container-titl-marg) * 0.5)); */
      }
    }
  }
}
.fade-leave-active {
  transition: opacity 0.7s ease;
}
.fade-enter-active {
  transition: opacity 0.7s ease 0.7s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
