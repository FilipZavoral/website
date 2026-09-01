<script setup lang="ts">
const { initialCommunity } = defineProps<{ initialCommunity?: string }>()
const { $counterscale } = useNuxtApp()

const wholeCountryValue = 'all-czech-communities'
const fakeDoorAlert = 'Tato možnost ještě není připravená, takže jsme nic neaktivovali. Sledujte prosím naše sociální sítě; už teď můžete odebírat kalendář přes iCalendar.'

// These browser-only convenience values are owned by this guide, retained until
// the visitor clears them, and never cross a network or analytics boundary.
const storedTelephone = useLocalStorage<string | null>('subscription-guide-telephone', null, { initOnMounted: true })
const storedEmail = useLocalStorage<string | null>('subscription-guide-email', null, { initOnMounted: true })
const telephone = computed({
  get: () => storedTelephone.value ?? '',
  set: value => { storedTelephone.value = value || null },
})
const email = computed({
  get: () => storedEmail.value ?? '',
  set: value => { storedEmail.value = value || null },
})

const { data: communities, status, refresh } = await useAsyncData('subscription-guide-communities', () => {
  return queryCollection('communities')
    .where('portal_meetup_id', 'IS NOT NULL')
    .select('path', 'title')
    .all()
})

const communityOptions = computed(() => [
  { label: 'Celé Česko', value: wholeCountryValue },
  ...(communities.value ?? []).map(community => ({ label: community.title, value: community.path.replace(/^\//, '') })),
])
const selectedCommunitySlugs = ref<string[]>([])
const hasInitializedScope = ref(false)

const normalizeScope = (scope: readonly string[]) => {
  const availableSlugs = new Set(communityOptions.value.map(option => option.value))
  const validScope = scope.filter(value => availableSlugs.has(value))
  return validScope.includes(wholeCountryValue)
    ? [wholeCountryValue]
    : [...new Set(validScope)]
}

watch([communities, selectedCommunitySlugs], ([loadedCommunities, scope]) => {
  if (!loadedCommunities) return

  if (!hasInitializedScope.value) {
    selectedCommunitySlugs.value = initialCommunity && communityOptions.value.some(option => option.value === initialCommunity)
      ? [initialCommunity]
      : [wholeCountryValue]
    hasInitializedScope.value = true
    return
  }

  const normalizedScope = normalizeScope(scope)
  if (normalizedScope.join() !== scope.join()) selectedCommunitySlugs.value = normalizedScope
}, { immediate: true })

const selectedCommunities = computed(() => {
  const configuredCommunities = communities.value ?? []
  if (selectedCommunitySlugs.value.includes(wholeCountryValue)) return configuredCommunities
  const selectedSlugs = new Set(selectedCommunitySlugs.value)
  return configuredCommunities.filter(community => selectedSlugs.has(community.path.replace(/^\//, '')))
})
const hasSelectedScope = computed(() => selectedCommunities.value.length > 0)
const isTelephoneValid = computed(() => /^[+\d][\d\s()-]{5,}$/.test(telephone.value.trim()))
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
const selectedScopeSummary = computed(() => selectedCommunitySlugs.value.includes(wholeCountryValue)
  ? 'Celé Česko'
  : selectedCommunities.value.map(community => community.title).join(', '))

const frequencyChoices = [
  { value: 'created', label: 'při vytvoření události', summary: 'Upozornění při vytvoření události' },
  { value: 'week-before', label: 'týden předem', summary: 'Upozornění týden předem' },
  { value: 'day-before', label: 'den předem', summary: 'Upozornění den předem' },
] as const
type FrequencyValue = typeof frequencyChoices[number]['value']

const selectedFrequencies = ref<FrequencyValue[]>(['created'])
const editingFrequencyFor = ref<string | null>(null)
const frequencySummary = computed(() => frequencyChoices
  .filter(choice => selectedFrequencies.value.includes(choice.value))
  .map(choice => choice.summary)
  .join(', '))

const setFrequency = (value: FrequencyValue, checked: boolean | 'indeterminate') => {
  if (checked === true) {
    selectedFrequencies.value = [...new Set([...selectedFrequencies.value, value])]
    return
  }

  if (selectedFrequencies.value.length > 1) {
    selectedFrequencies.value = selectedFrequencies.value.filter(choice => choice !== value)
  }
}

const futureMethods = [
  {
    title: 'SMS',
    description: 'Až bude služba připravená, pošleme SMS podle zvoleného nastavení.',
  },
  {
    title: 'E-mail',
    description: 'Až bude služba připravená, e-mail může obsahovat událost, kterou si přidáte do vlastního kalendáře.',
  },
  {
    title: 'Oznámení ve webu',
    description: 'Až bude služba připravená, budete si moci zapnout oznámení v tomto prohlížeči.',
  },
] as const

const retryCommunities = () => refresh()

const expressSmsInterest = () => {
  $counterscale.trackSmsIntent()
  window.alert(fakeDoorAlert)
}

const expressEmailInterest = () => {
  $counterscale.trackEmailIntent()
  window.alert(fakeDoorAlert)
}

const expressWebInterest = () => {
  $counterscale.trackWebIntent()
  window.alert(fakeDoorAlert)
}
</script>

<template>
  <section class="mx-auto max-w-[720px] space-y-8" aria-labelledby="subscription-guide-title">
    <div class="space-y-2">
      <h2 id="subscription-guide-title" class="text-[28px] font-semibold leading-tight">Sledovat události</h2>
      <p>Vyberte, které komunity chcete sledovat. Nastavení platí pro všechny možnosti níže.</p>
      <p class="text-sm text-muted">iCalendar je dostupný hned. SMS, e-mail a oznámení ve webu zatím jen připravujeme.</p>
    </div>

    <div class="space-y-2">
      <label for="subscription-community-scope" class="text-sm font-semibold">Komunity, které chcete sledovat</label>
      <USelectMenu
        id="subscription-community-scope"
        v-model="selectedCommunitySlugs"
        :items="communityOptions"
        value-key="value"
        multiple
        clear
        :disabled="status === 'pending' || status === 'error' || !communities"
        :search-input="{ placeholder: 'Hledat komunitu…' }"
        aria-label="Komunity, které chcete sledovat"
        placeholder="Vyberte komunity"
        class="w-full"
      />
      <p v-if="status === 'pending'" role="status" class="text-sm text-muted">Načítáme komunity…</p>
      <div v-else-if="status === 'error' || !communities" class="space-y-3" role="alert">
        <p class="text-sm text-muted">Komunity se nyní nepodařilo načíst. Obnovte stránku a zkuste to znovu.</p>
        <UButton color="neutral" variant="outline" @click="retryCommunities">Obnovit</UButton>
      </div>
      <p v-else-if="communities.length === 0" role="status" class="text-sm text-muted">Pro odběr kalendáře zatím není nastavená žádná komunita.</p>
      <p v-else-if="hasSelectedScope" class="text-sm text-muted">
        Vybráno: <span class="font-semibold text-highlighted">{{ selectedScopeSummary }}</span>
      </p>
    </div>

    <div v-if="status === 'success' && communities?.length" class="space-y-4">
      <div v-if="!hasSelectedScope" class="rounded-lg border border-default bg-elevated p-4" role="status">
        <h3 class="text-xl font-semibold leading-tight">Vyberte alespoň jednu komunitu</h3>
        <p class="mt-2 text-sm text-muted">Potom vám ukážeme dostupné možnosti sledování a adresu kalendáře.</p>
      </div>

      <template v-for="(method, index) in futureMethods" :key="method.title">
        <UPageCard>
          <template #header>
            <div class="flex flex-wrap items-center gap-3">
              <h3 class="text-xl font-semibold leading-tight">{{ method.title }}</h3>
              <UBadge color="neutral" variant="subtle">Připravujeme</UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <p>{{ method.description }}</p>
            <p class="text-sm text-muted">Náhled budoucího doručování pro vybrané komunity.</p>
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm text-muted">{{ frequencySummary }}</p>
              <UButton color="neutral" variant="link" :disabled="!hasSelectedScope" @click="editingFrequencyFor = method.title">
                Upravit
              </UButton>
            </div>
            <div v-if="editingFrequencyFor === method.title" class="space-y-3 rounded-lg border border-default bg-elevated p-4">
              <p class="text-sm font-semibold">Kdy byste chtěli dostávat upozornění?</p>
              <UCheckbox
                v-for="choice in frequencyChoices"
                :key="choice.value"
                :model-value="selectedFrequencies.includes(choice.value)"
                :label="choice.label"
                @update:model-value="setFrequency(choice.value, $event)"
              />
              <UButton color="neutral" variant="outline" @click="editingFrequencyFor = null">Hotovo</UButton>
            </div>

            <template v-if="method.title === 'SMS'">
              <div class="space-y-2">
                <label for="subscription-telephone" class="text-sm font-semibold">Telefonní číslo</label>
                <UInput
                  id="subscription-telephone"
                  v-model="telephone"
                  type="tel"
                  autocomplete="tel"
                  aria-describedby="subscription-telephone-privacy"
                />
                <p id="subscription-telephone-privacy" class="text-sm text-muted">Číslo zůstává pouze v tomto prohlížeči. Kdykoli ho smažete, odstraní se i z místního úložiště.</p>
              </div>
              <UButton color="neutral" :disabled="!hasSelectedScope || !isTelephoneValid" @click="expressSmsInterest">Mám zájem o SMS</UButton>
            </template>

            <template v-else-if="method.title === 'E-mail'">
              <div class="space-y-2">
                <label for="subscription-email" class="text-sm font-semibold">E-mail</label>
                <UInput
                  id="subscription-email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  aria-describedby="subscription-email-privacy"
                />
                <p id="subscription-email-privacy" class="text-sm text-muted">E-mail zůstává pouze v tomto prohlížeči. Kdykoli ho smažete, odstraní se i z místního úložiště.</p>
              </div>
              <UButton color="neutral" :disabled="!hasSelectedScope || !isEmailValid" @click="expressEmailInterest">Mám zájem o e-mail</UButton>
            </template>

            <UButton v-else color="neutral" :disabled="!hasSelectedScope" @click="expressWebInterest">Mám zájem o oznámení ve webu</UButton>
          </div>
        </UPageCard>
        <USeparator v-if="index < futureMethods.length - 1" label="nebo" />
      </template>

      <USeparator label="nebo" />
      <UPageCard>
      <template #header>
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-semibold leading-tight">iCalendar</h3>
          <UBadge color="primary" variant="subtle">Již dostupné</UBadge>
        </div>
      </template>

        <p>Zkopírujte si adresu a přihlaste ji k odběru ve své kalendářové aplikaci.</p>
        <p v-if="hasSelectedScope" class="mt-2 text-sm text-muted">Vybraný rozsah: {{ selectedScopeSummary }}</p>
        <p v-else class="mt-2 text-sm text-muted">Vyberte alespoň jednu komunitu, abyste získali adresu kalendáře.</p>
      </UPageCard>
    </div>
  </section>
</template>
