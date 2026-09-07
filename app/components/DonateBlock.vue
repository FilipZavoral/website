<script setup lang="ts">
import LightningQrCode from './LightningQrCode.vue'

const props = defineProps<{
  address: string
}>()

const lightningUrl = computed(() => `lightning:${props.address}`)
</script>

<template>
  <div class="flex flex-col items-center gap-5 text-center">
    <div class="rounded-lg bg-white p-3">
      <LightningQrCode :address="address" :alt="`Lightning QR pro ${address}`" />
    </div>
    <code class="text-sm text-muted select-all">{{ address }}</code>
    <UButton :to="lightningUrl" trailing-icon="i-bitcoin-icons-lightning-filled">
      Otevřít peněženku
    </UButton>
  </div>
</template>
