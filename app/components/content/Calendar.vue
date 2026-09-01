<script setup lang="ts">
import type { PortalEvent } from '#shared/types/portalEvents'
import { eventJsonLd, projectCalendarEvents } from '~/utils/calendar'

const { community } = defineProps<{ community: string }>()

const endpoint = computed(() => `/api/events?community=${encodeURIComponent(community)}`)
const { data, status, refresh } = await useFetch<PortalEvent[]>(endpoint, {
  key: endpoint,
})

const events = computed(() => projectCalendarEvents(data.value ?? []))
const isSubscriptionOpen = ref(false)

const eventLinkHostname = (safeLink: string) => new URL(safeLink).hostname

onMounted(() => refresh())

useHead(() => ({
  script: data.value?.length
    ? [{
        key: `calendar-json-ld-${community}`,
        type: 'application/ld+json',
        innerHTML: eventJsonLd(data.value),
      }]
    : [],
}))
</script>

<template>
  <UPageCard as="section" aria-labelledby="calendar-title" class="my-8 min-w-0">
    <template #header>
      <h2 id="calendar-title" class="text-xl font-semibold leading-tight">Nadcházející události</h2>
    </template>

    <div class="min-w-0" aria-live="polite">
      <template v-if="status === 'pending' && !data">
        <p role="status" class="text-sm text-muted">Načítáme nadcházející události…</p>
      </template>
      <UAlert
        v-else-if="status === 'error' || !data"
        role="alert"
        color="neutral"
        variant="subtle"
        title="Kalendář se nyní nepodařilo načíst. Zkuste stránku obnovit později."
      />
      <div v-else-if="data.length === 0" role="status">
        <h3 class="text-xl font-semibold leading-tight">Žádné nadcházející události</h3>
        <p class="mt-2 text-sm text-muted">Nyní nejsou naplánované žádné nadcházející události.</p>
      </div>
      <UAccordion v-else :items="events" :ui="{ trigger: 'text-base' }">
        <template #default="{ item: event }">
          <span class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span class="shrink-0 flex gap-2 items-center">
              <div class="text-3xl text-primary font-thin w-[1.4em]">
                {{ event.weekdayLabel }}
              </div>
              <div class="text-xs text-muted w-[10em]">
                <time class="block" :datetime="event.start">{{ event.dateLabel }}</time>
                <time :datetime="event.start">{{ event.startTime }}</time>
                <template v-if="event.endTime && event.end">
                  – <time :datetime="event.end">{{ event.endTime }}</time>
                </template>
              </div>
            </span>
            <span class="min-w-0 font-medium text-highlighted flex flex-wrap gap-3">
              {{ event.title }}
              <UBadge v-if="event.community" color="neutral" variant="subtle" size="md">
                {{ event.community.name }}
              </UBadge>
              <UBadge v-for="tag in event.tagNames" :key="tag" color="neutral" variant="outline" size="md">
                {{ tag }}
              </UBadge>
            </span>
          </span>
        </template>

        <template #content="{ item: event }">
          <div class="space-y-4 py-3.5 text-sm">
            <div
              v-if="event.location || event.community"
              class="flex flex-wrap justify-between gap-x-4 gap-y-1 text-muted"
            >
              <p v-if="event.location">
                <span class="font-medium text-highlighted">Místo:</span> {{ event.location }}
              </p>
              <!-- <p v-if="event.community">
                <span class="font-medium text-highlighted">Komunita:</span>
                <ULink :to="event.community.path" class="ms-1">{{ event.community.name }}</ULink>
              </p> -->
            </div>
            <MDC v-if="event.description" :value="event.description" class="prose prose-sm dark:prose-invert" />
            <UButton
              v-if="event.safeLink"
              :to="event.safeLink"
              target="_blank"
              rel="noopener noreferrer"
              trailing-icon="i-lucide-external-link"
              :aria-label="`Otevřít událost ${event.title} v novém okně.`"
            >
              {{ eventLinkHostname(event.safeLink) }}
            </UButton>
          </div>
        </template>
      </UAccordion>
    </div>

    <template #footer>
      <UModal v-model:open="isSubscriptionOpen" title="Sledovat události" scrollable>
        <UButton>Sledovat události této komunity</UButton>

        <template #body>
          <SubscriptionGuide v-if="isSubscriptionOpen" :initial-community="community" />
        </template>
      </UModal>
    </template>
  </UPageCard>
</template>
