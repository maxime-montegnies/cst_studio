<script setup lang="ts">
import { RouterLink } from "vue-router";
import { onMounted, onBeforeUnmount, ref } from "vue";
import { eventBus } from "@/eventBus";
import { hexToCSS } from "../utils/utils.ts";
import { useAppState } from "../utils/State.ts";

import { t } from "@/strings";

const gradientStart = ref("#D80084");
const gradientEnd = ref("#FF8F66");

onMounted(() => {
  eventBus.emit("introCst");
});

onBeforeUnmount(() => {});
</script>

<template>
  <main class="main">
    <div id="main-hero"></div>
    <section class="section main-hero" >
      <header>
        
      </header>
      <main></main>
      <footer>
<h1>Votre vision en Image</h1>
        <p>Du concept à la livraison, nous transformons vos idées en contenus visuels qui captivent, convertissent et marquent les esprits.</p>

      </footer>
    </section>



<section class="horizontal-section">
  <div class="horizontal-sticky">
    <header>
      <h1>Nos Services</h1>
      <p>Production audiovisuelle clé en main, de la conception à la diffusion.</p>
    </header>
    <main class="horizontal-track">
      <article>
        <span> 01 — PRODUCTION VIDÉO </span>
        <h3>Vidéo d'Entreprise</h3>
        <p>Films institutionnels, publicités digitales, interviews corporate, reportages événementiels. L'exigence du cinéma au service de votre message.</p>
      </article>
      <article>
        <span> 02 — IMAGERIE AÉRIENNE </span>
        <h3>Drone & Aérien</h3>
        <p>Drone certifié catégorie A1/A3, prises de vue 4K à 360°, time-lapse aériens. Des angles impossibles qui subliment vos espaces et événements.</p>
      </article>
      <article>
        <span> 03 — PHOTOGRAPHIE </span>
        <h3>Photo Corporate</h3>
        <p>Portraits corporate, shooting événementiel, photographie d'architecture et de produit. Des images qui renforcent votre identité visuelle.</p>
      </article>
      <article>
        <span> 04 — WEB & DIGITAL </span>
        <h3>Site Internet</h3>
        <p>Conception web sur mesure, identité digitale, landing pages haute performance. Votre vitrine en ligne pensée pour attirer, convaincre et convertir.</p>
      </article>
    </main>
    <footer>
      <p>Chaque projet reçoit l'exigence d'un film et la précision d'un brief stratégique.</p>
    </footer>
  </div>
</section>





<section class="horizontal-section">
  <div class="horizontal-sticky">
    <header>
      <h1>Dernieres Prods</h1>
      <p>Les dernières histoires que nous avons imaginées, produites et mises en images.</p>
    </header>
    <main class="horizontal-track">
      <article>
        <span> 01 — PRODUCTION VIDÉO </span>
        <h3>Vidéo d'Entreprise</h3>
        <p>Films institutionnels, publicités digitales, interviews corporate, reportages événementiels. L'exigence du cinéma au service de votre message.</p>
      </article>
      <article>
        <span> 02 — IMAGERIE AÉRIENNE </span>
        <h3>Drone & Aérien</h3>
        <p>Drone certifié catégorie A1/A3, prises de vue 4K à 360°, time-lapse aériens. Des angles impossibles qui subliment vos espaces et événements.</p>
      </article>
      <article>
        <span> 03 — PHOTOGRAPHIE </span>
        <h3>Photo Corporate</h3>
        <p>Portraits corporate, shooting événementiel, photographie d'architecture et de produit. Des images qui renforcent votre identité visuelle.</p>
      </article>
      <article>
        <span> 04 — WEB & DIGITAL </span>
        <h3>Site Internet</h3>
        <p>Conception web sur mesure, identité digitale, landing pages haute performance. Votre vitrine en ligne pensée pour attirer, convaincre et convertir.</p>
      </article>
    </main>
    <footer>
      <p>Du premier brief au dernier plan, chaque image compte.</p>
    </footer>
  </div>
</section>

<section class="section-half">
</section>


  </main>
</template>

<style scoped>
#main-hero{
  position: absolute;
  height: 90vh;
}
main.main {
  position: relative;
  display: flex;
  flex-direction: column;
  .section-half {
    min-height: 50vh;
    display: flex;
  }
  .section {
    display: flex;
    justify-content: center;
    flex-direction: column;
    /* height: calc(100vh - 80px); */
    height: calc(100dvh - 80px);
    margin-top: 80px;
    padding-left: 20px;
    header{
      /* background-color: #FF000010; */
      flex: 0 0 15%;
    }
    main{
      /* background-color: #00FF0010;; */
      flex: 0 0 65%;
    }
    footer{
      /* background-color: #0000FF10;; */
      flex: 0 0 20%;
    }
    p{
      opacity: 0.4;
    }
    &.main-hero{
     footer{
      /* background-color: #0000FF10;; */
      flex: 0 0 60%;
    } 
    }
  }
  .horizontal-section {
    position: relative;
    height: 400vh;
    align-items: normal;
    .horizontal-sticky {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: hidden;
      header{
        padding-left: 20px;
        position: absolute;
        top: 60px;
        p{
          opacity: 0.4;
        }
      }
      footer{
        position: absolute;
        bottom: 60px;
        text-align: center;
        padding-left: 20px;
        padding-right: 20px;
        opacity: 0.4;
      }
      .horizontal-track {
        display: flex;
        /* background-color: blue; */
        width: max-content;
        height: 100%;
        article {
          width: 100vw;
          height: 100%;
          padding-left: 40px;
          padding-right: 20px;
          flex: 0 0 100vw;
          display: flex;
          justify-content: center;
          flex-direction: column;
          p{
            opacity: 0.4;
          }
          /* font-size: 60px; */
          /* background-color: aquamarine; */
          &:nth-child(2){
            /* background-color:bisque; */
          }
        }
      }
    }
  }




}
</style>
