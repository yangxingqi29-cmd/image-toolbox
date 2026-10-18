<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <span class="brand-mark" aria-hidden="true">
    <span class="brand-mark__sun"></span>
    <span class="brand-mark__mountain brand-mark__mountain--left"></span>
    <span class="brand-mark__mountain brand-mark__mountain--right"></span>
  </span>
  <span v-if="!compact" class="brand-copy">
    <strong>{{ $t('brand.name') }}</strong>
    <small>{{ $t('brand.tagline') }}</small>
  </span>
</template>
