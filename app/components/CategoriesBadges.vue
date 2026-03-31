<script setup lang="ts">
const props = withDefaults(defineProps<{
  categoriesStems?: string[]
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
}>(), {
  size: 'md',
  disabled: false,
})

const categories = props.categoriesStems
  ? useArticleCategories(props.categoriesStems)
  : useArticleCategories()
</script>

<template>
  <UButton v-for="cat in categories" :key="cat.path" :to="disabled ? undefined : cat.path" variant="subtle"
    color="neutral" :size="size">
    {{ cat.title }}
  </UButton>
</template>
