<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  authorId: string
}>()

const { data: author } = await useAsyncData(`author-${props.authorId}`, async () => {
  return await queryCollection('people').path(`/people/${props.authorId}`).first()
})

const isDonateOpen = ref(false)
const qrCodeDataUrl = ref<string | null>(null)

const lightningUrl = computed(() => {
  if (!author.value?.donateLnAddress) return null
  return `lightning:${author.value.donateLnAddress}`
})

watchEffect(async () => {
  if (!lightningUrl.value) {
    qrCodeDataUrl.value = null
    return
  }

  qrCodeDataUrl.value = await QRCode.toDataURL(lightningUrl.value, {
    margin: 1,
    width: 256,
  })
})
</script>

<template>
  <div v-if="author" class="flex items-start md:items-center gap-8 py-6">
    <UAvatar :src="author.avatar" :alt="author.title" size="3xl" :ui="{ root: 'size-16 sm:size-20 md:size-36' }" />

    <div class="flex-1 min-w-0 -mb-5">
      <div class="flex gap-4 flex-wrap items-center">
        <h3 class="font-semibold text-lg grow">{{ author.title }}</h3>
        <div class="flex gap-4">
          <UModal v-if="author.donateLnAddress" v-model:open="isDonateOpen" title="Podpořit přes Lightning"
            :ui="{ footer: 'justify-center' }">
            <UButton size="md" trailing-icon="i-bitcoin-icons-lightning-filled">
              Podpořit
            </UButton>

            <template #body>
              <div class="flex flex-col items-center gap-4">
                <div class="rounded-lg border border-muted p-3 bg-white">
                  <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" :alt="`QR ${author?.title || ''}`" class="h-48 w-48" />
                  <div v-else class="h-48 w-48 flex items-center justify-center text-sm text-muted">
                    QR se připravuje...
                  </div>
                </div>
                <p class="text-sm text-muted text-center break-words">
                  {{ author?.donateLnAddress }}
                </p>
                <UButton v-if="lightningUrl" :to="lightningUrl" target="_blank"
                  trailing-icon="i-bitcoin-icons-lightning-filled">
                  Otevřít peněženku
                </UButton>
              </div>
            </template>
          </UModal>
          <SocialLinks :links="author?.links || []" />
        </div>
      </div>

      <ContentRenderer v-if="author.body" :value="author"
        class="text-sm text-muted prose dark:prose-invert prose-sm mt-1" />
    </div>
  </div>
</template>
