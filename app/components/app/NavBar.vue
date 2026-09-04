<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo />
      </NuxtLink>
    </template>

    <AppNavMenu class="max-lg:hidden" />

    <template #right>
      <AppSocialMenu class="max-lg:hidden" />
    </template>

    <template #body>
      <AppNavMenu orientation="vertical" />
      <AppSocialMenu class="justify-center mt-14" />
    </template>
  </UHeader>
</template>
