<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()
</script>

<template>
  <NuxtLayout name="wallpaper" bg-src="/images/app/not-found-wallpaper.webp">
    <div class="max-w-md flex flex-col items-center gap-10 ">
      <h1 class="text-9xl font-bold text-primary/80">
        {{ error.status }}
      </h1>

      <div class="text-4xl font-semibold text-white">
        <template v-if="error.status === 404">Špatná skládka</template>
        <template v-else>Nastala chyba</template>
      </div>

      <div class="">
        <template v-if="error.status === 404">
          <ProseP><span>Nebuť jako <ProseA href="https://forbes.cz/bitcoin-na-skladce-uz-brit-prestal-hledat-prakticka-lekce-jak-neprijit-o-miliardy/" target="_blank">James Howells</ProseA> který beznadějně hledá svůj harddisk s 8 000 bitcoiny na skládce v Newportu.</span></ProseP>
          <ProseP><span>Zkontroluj jestli hledáš na správné adrese nebo se zkus prohrabat od začátku z hlavní stránky.</span></ProseP>
        </template>

        <ProseP v-else><span>{{ error.message || 'Omlouváme se, něco se pokazilo.' }}</span></ProseP>
      </div>

      <UButton size="lg" label="← Zpět na hlavní stránku" href="/" />
    </div>
</NuxtLayout>
</template>

<style lang="css" scoped>
@reference "assets/css/main.css";

span {
  @apply px-2 py-1.5 bg-default box-decoration-clone rounded;
}
</style>
