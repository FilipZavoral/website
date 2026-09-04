<script setup lang="ts">
import type { Miner } from '#shared/types/miners'

const { data, status, refresh } = await useFetch<Miner[]>('/api/miners')
const showAll = ref(false)
const miners = computed(() => data.value ?? [])
const visibleMiners = computed(() => showAll.value ? miners.value : miners.value.slice(0, 3))
const hashRateFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })

onMounted(() => refresh())
</script>

<template>
  <UPageCard as="section" aria-labelledby="miners-title" class="my-8 min-w-0">
    <template #header>
      <h2 id="miners-title" class="text-xl font-semibold leading-tight">Těží Bitcoin pro 21</h2>
    </template>

    <template #body>
      <div class="min-w-0" aria-live="polite">
        <p v-if="status === 'pending' && !data" role="status" class="text-sm text-muted">
          Načítáme aktuální výkon těžařů…
        </p>

        <UAlert
          v-else-if="status === 'error' || !data"
          role="alert"
          color="neutral"
          variant="subtle"
          title="Aktuální výkon těžařů se nepodařilo načíst."
        >
          <template #actions>
            <UButton color="neutral" variant="outline" size="sm" @click="refresh()">
              Zkusit znovu
            </UButton>
          </template>
        </UAlert>

        <p v-else-if="miners.length === 0" role="status" class="text-sm text-muted">
          Momentálně není aktivní žádný těžař.
        </p>

        <template v-else>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-default text-left text-muted">
                  <th scope="col" class="pb-2 pe-4 font-medium">Jméno</th>
                  <th scope="col" class="pb-2 pe-4 font-medium">Hashrate za 24 hodin</th>
                  <th scope="col" class="pb-2 font-medium">Stav</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="miner in visibleMiners" :key="miner.name" class="border-b border-muted last:border-0">
                  <td class="py-2 pe-4 font-medium text-highlighted">{{ miner.name }}</td>
                  <td class="py-2 pe-4 tabular-nums">{{ hashRateFormatter.format(miner.hashRate24hGh) }} GH/s</td>
                  <td class="py-2">
                    <UBadge :color="miner.state === 'ok' ? 'success' : 'warning'" variant="subtle">
                      {{ miner.state }}
                    </UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <UButton
            v-if="miners.length > 3"
            color="neutral"
            variant="ghost"
            size="sm"
            class="mt-3"
            @click="showAll = !showAll"
          >
            {{ showAll ? 'Skrýt' : `Zobrazit další (${miners.length - 3})` }}
          </UButton>
        </template>
      </div>
    </template>
  </UPageCard>
</template>
