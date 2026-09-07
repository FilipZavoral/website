<script setup lang="ts">
const { address } = defineProps<{
  address: string
  alt: string
}>()

const qrCodeDataUrl = ref<string | null>(null)

if (import.meta.client) {
  watch(() => address, async (currentAddress, _, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    const { default: QRCode } = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(`lightning:${currentAddress}`, {
      margin: 1,
      width: 256,
    })

    if (!cancelled) qrCodeDataUrl.value = dataUrl
  }, { immediate: true })
}
</script>

<template>
  <img
    v-if="qrCodeDataUrl"
    :src="qrCodeDataUrl"
    :alt="alt"
    width="256"
    height="256"
    class="size-48 shrink-0"
  >
  <div v-else class="size-48 shrink-0" aria-hidden="true" />
</template>
