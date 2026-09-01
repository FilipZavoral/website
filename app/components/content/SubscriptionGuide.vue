<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const { initialCommunity } = defineProps<{ initialCommunity: string }>()

const origin = useRequestURL().origin
const subscriptionUrl = computed(() => `${origin}/ical/${encodeURIComponent(initialCommunity)}`)
const copyError = ref(false)
const { copy } = useClipboard({ legacy: true })

const copySubscriptionUrl = async () => {
  copyError.value = false
  try {
    await copy(subscriptionUrl.value)
  } catch {
    copyError.value = true
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-6" aria-labelledby="subscription-guide-title">
    <div class="space-y-2">
      <h2 id="subscription-guide-title" class="text-2xl font-semibold leading-tight">Sledovat události</h2>
      <p>iCalendar je dostupný hned. Další možnosti sledování právě připravujeme.</p>
    </div>

    <UPageCard>
      <template #header>
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-semibold leading-tight">iCalendar</h3>
          <UBadge color="primary" variant="subtle">Již dostupné</UBadge>
        </div>
      </template>

      <p>Zkopírujte si adresu a přihlaste ji k odběru ve své kalendářové aplikaci.</p>

      <div class="mt-4 flex flex-col gap-2 sm:flex-row">
        <UInput :model-value="subscriptionUrl" readonly aria-label="Adresa kalendáře" class="min-w-0 flex-1" />
        <UButton color="primary" class="justify-center" @click="copySubscriptionUrl">Kopírovat</UButton>
      </div>

      <UAlert
        v-if="copyError"
        class="mt-4"
        color="neutral"
        variant="subtle"
        title="Adresu se nepodařilo zkopírovat. Označte ji a zkopírujte ručně."
      />
    </UPageCard>
  </section>
</template>
