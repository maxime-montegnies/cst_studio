import { ref } from "vue";

export type AppState = "intro";

const screenWidth = ref(1);
const screenHeight = ref(1);
const colorCurrent = ref(0);
const state = ref<AppState>("intro");
const debug = ref<boolean>(false);

export function useAppState() {
  return {
    debug,
    screenWidth,
    screenHeight,
    colorCurrent,
    state,
  };
}
const resize = () => {
  const height = window.visualViewport?.height ?? window.innerHeight;
  const width = window.visualViewport?.width ?? window.innerWidth;
  
  document.documentElement.style.setProperty("--vw", `${width}px`);
  document.documentElement.style.setProperty("--vh", `${height}px`);
  screenWidth.value = window.innerWidth;
  screenHeight.value = window.innerHeight;
  screenWidth.value = width;
  screenHeight.value = height;
};
window.addEventListener("resize", resize);
resize();
