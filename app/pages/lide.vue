<script setup lang="ts">
const { data } = await useAsyncData('people-list', async () => {
  return queryCollection('people').order('title', 'ASC').all()
})
</script>

<template>
  <Head>
    <Title>Lidé</Title>
    <Meta name="description" content="Lidé, kteří se podílejí na Jednadvacítce." />
    <Meta property="og:title" content="Lidé" />
    <Meta property="og:type" content="website" />
  </Head>

  <UContainer class="max-w-3xl py-8">
    <UPage>
      <UPageHeader title="Lidé" description="Lidé, kteří se podílejí na Jednadvacítce." />

      <UPageBody>
        <div class="divide-y divide-default">
          <AuthorBlock
            v-for="person in data"
            :key="person.path"
            :author-id="person.path.replace('/people/', '')"
          />
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>
