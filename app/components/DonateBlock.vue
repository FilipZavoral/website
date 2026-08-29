<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  address: string
}>()

const lightningUrl = computed(() => `lightning:${props.address}`)
const { data: qrCodeDataUrl } = await useAsyncData(`donate-qr-${props.address}`, () => {
  return QRCode.toDataURL(lightningUrl.value, { margin: 1, width: 256 })
})
</script>

<template>
  <div class="flex flex-col items-center gap-5 text-center">
    <div class="rounded-lg bg-white p-3">
      <img
        v-if="qrCodeDataUrl"
        :src="qrCodeDataUrl"
        :alt="`Lightning QR pro ${address}`"
        width="256"
        height="256"
        class="size-48"
      >
    </div>
    <code class="text-sm text-muted select-all">{{ address }}</code>
    <UButton :to="lightningUrl" trailing-icon="i-bitcoin-icons-lightning-filled">
      Otevřít peněženku
    </UButton>
  </div>
</template>
