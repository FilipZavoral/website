<script setup lang="ts">
import type { CommunitiesCollectionItem } from '@nuxt/content'

defineProps<{
  community: CommunitiesCollectionItem
}>()
</script>

<template>

  <Head>
    <Title>{{ community.title }}</Title>
    <Meta property="og:title" :content="community.title" />
    <Meta property="og:type" content="website" />
  </Head>

  <UContainer>
    <header class="mb-8">
      <h1 class="text-4xl font-bold">{{ community.title }}</h1>
    </header>

    <div v-if="community.body" class="mb-8 prose dark:prose-invert">
      <ContentRenderer :value="community" />
    </div>

    <div v-if="community.map" class="mb-6 rounded-lg border border-default p-4">
      <p class="mb-2 text-sm text-muted">{{ community.title }}</p>
      <div class="text-sm">
        <p>Souřadnice: {{ community.map.lat }}, {{ community.map.lng }}</p>
        <p>Zoom: {{ community.map.zoom }}</p>
      </div>
    </div>

    <div v-if="community.signal_group" class="mb-6">
      <UButton
        :to="community.signal_group"
        target="_blank"
        rel="noopener noreferrer"
        label="Připoj se do Signal skupiny"
        trailing-icon="i-lucide-external-link"
      />
    </div>

    <div v-if="community.organizers?.length" class="mt-8">
      <h2 class="text-xl font-semibold mb-4">Organizátoři</h2>
      <AuthorBlock v-for="organizer in community.organizers" :key="organizer" :author-id="organizer" />
    </div>
  </UContainer>
</template>
