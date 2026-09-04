<template>
  <section class="relative isolate flex min-h-128 items-center justify-center overflow-hidden bg-black px-6 py-16 text-center sm:py-20">
    <NuxtImg
      src="/images/liga/hero-background.jpg"
      alt=""
      width="1024"
      height="1536"
      preload
      class="absolute inset-0 z-0 size-full object-cover object-center opacity-70"
      aria-hidden="true"
    />
    <div class="absolute inset-0 z-10 bg-linear-to-b from-black/60 via-black/75 to-black" aria-hidden="true" />

    <div class="relative z-20 max-w-xl">
      <NuxtImg
        src="/images/liga/logo-foreground.png"
        alt="Logo BTC Ligy"
        width="1024"
        height="1536"
        class="mx-auto w-32 sm:w-40"
      />
      <p class="mt-5 text-sm font-semibold tracking-wide text-primary uppercase">Proof of Knowledge</p>
      <h1 class="mt-3 text-4xl font-bold tracking-tight text-inverted sm:text-6xl">BTC Liga</h1>
      <p class="mt-5 text-base leading-7 text-inverted sm:text-lg">
        Celoroční vědomostní soutěž pro bitcoinové týmy z Česka a Slovenska.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <UButton to="mailto:liga@jednadvacet.org">Zaregistrovat tým</UButton>
        <UButton to="#moderatori" color="neutral" variant="outline">Chci pořádat kvíz</UButton>
      </div>
    </div>
  </section>
</template>
