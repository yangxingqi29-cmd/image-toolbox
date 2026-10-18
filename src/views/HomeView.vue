<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowRight,
  Check,
  Download,
  FileImage,
  Gauge,
  ImageDown,
  LockKeyhole,
  MonitorSmartphone,
  Move,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from '@lucide/vue'
import ToolCard from '@/components/common/ToolCard.vue'
import { tools } from '@/data/tools'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { localizedPath } from '@/utils/locale-route'

const route = useRoute()
const locale = computed<AppLocale>(() =>
  isAppLocale(route.params.locale) ? route.params.locale : 'zh',
)
const faqs = [1, 2, 3, 4]
</script>

<template>
  <section class="hero-section">
    <div class="hero-glow hero-glow--one" aria-hidden="true"></div>
    <div class="hero-glow hero-glow--two" aria-hidden="true"></div>
    <div class="container hero-grid">
      <div class="hero-copy">
        <span class="eyebrow"
          ><Sparkles :size="16" aria-hidden="true" />{{ $t('hero.eyebrow') }}</span
        >
        <h1>
          {{ $t('hero.titleStart') }}
          <span>{{ $t('hero.titleAccent') }}</span>
        </h1>
        <p class="hero-description">{{ $t('hero.description') }}</p>
        <div class="hero-actions">
          <RouterLink
            class="button button--primary"
            :to="localizedPath(locale, 'image-compressor')"
          >
            <ImageDown :size="18" aria-hidden="true" />{{ $t('hero.primaryAction') }}
          </RouterLink>
          <a class="button button--secondary" href="#tools">{{ $t('hero.secondaryAction') }}</a>
        </div>
      </div>

      <div class="process-card" aria-hidden="true">
        <div class="process-card__topline">
          <span>{{ $t('demo.label') }}</span>
          <span class="status-dot">{{ $t('demo.ready') }}</span>
        </div>
        <div class="image-preview-art">
          <span class="image-preview-art__sun"></span>
          <span class="image-preview-art__figure"></span>
          <span class="image-preview-art__ground"></span>
          <span class="scan-line"></span>
        </div>
        <div class="file-row">
          <span class="file-row__icon"><FileImage :size="20" /></span>
          <span
            ><strong>{{ $t('demo.fileName') }}</strong
            ><small>{{ $t('demo.fileMeta') }}</small></span
          >
          <span class="file-row__check"><Check :size="16" /></span>
        </div>
        <div class="process-steps">
          <span><Upload :size="17" />{{ $t('demo.stepUpload') }}</span>
          <ArrowRight :size="14" />
          <span><SlidersHorizontal :size="17" />{{ $t('demo.stepProcess') }}</span>
          <ArrowRight :size="14" />
          <span><Download :size="17" />{{ $t('demo.stepDownload') }}</span>
        </div>
      </div>
    </div>

    <div class="container trust-row">
      <div>
        <ShieldCheck :size="22" /><span
          ><strong>{{ $t('hero.privacyNote') }}</strong
          ><small>{{ $t('hero.privacyDetail') }}</small></span
        >
      </div>
      <div>
        <Gauge :size="22" /><span
          ><strong>{{ $t('hero.speedNote') }}</strong
          ><small>{{ $t('hero.speedDetail') }}</small></span
        >
      </div>
      <div>
        <MonitorSmartphone :size="22" /><span
          ><strong>{{ $t('hero.accessNote') }}</strong
          ><small>{{ $t('hero.accessDetail') }}</small></span
        >
      </div>
    </div>
  </section>

  <section id="tools" class="section tools-section">
    <div class="container">
      <div class="section-heading section-heading--split">
        <div>
          <span class="eyebrow">{{ $t('home.toolsEyebrow') }}</span>
          <h2>{{ $t('home.toolsTitle') }}</h2>
        </div>
        <p>{{ $t('home.toolsDescription') }}</p>
      </div>

      <div class="home-tool-grid">
        <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" :locale="locale" />
      </div>
    </div>
  </section>

  <section class="section feature-section">
    <div class="container feature-grid">
      <div class="id-photo-art" aria-hidden="true">
        <div class="id-photo-art__workspace">
          <span class="art-toolbar"><Move :size="18" /><SlidersHorizontal :size="18" /></span>
          <div class="portrait-frame">
            <span class="portrait-head"></span>
            <span class="portrait-body"></span>
            <span class="guide guide--horizontal"></span>
            <span class="guide guide--vertical"></span>
          </div>
          <div class="color-dots"><i></i><i></i><i></i><i></i></div>
        </div>
        <span class="floating-card floating-card--top"
          ><ScanFace :size="18" />{{ $t('home.featuredMaskLabel') }}</span
        >
        <span class="floating-card floating-card--bottom"><Check :size="17" />295 × 413 px</span>
      </div>

      <div class="feature-copy">
        <span class="eyebrow"><ScanFace :size="16" />{{ $t('home.featuredEyebrow') }}</span>
        <h2>{{ $t('home.featuredTitle') }}</h2>
        <p>{{ $t('home.featuredDescription') }}</p>
        <div class="feature-points">
          <span><LockKeyhole :size="18" />{{ $t('home.featuredPrivacy') }}</span>
          <span><FileImage :size="18" />{{ $t('home.featuredSizes') }}</span>
        </div>
        <div class="feature-actions">
          <RouterLink class="button button--primary" :to="localizedPath(locale, 'id-photo')">
            {{ $t('common.learnMore') }}<ArrowRight :size="18" />
          </RouterLink>
          <span class="status-badge">{{ $t('home.featuredBadge') }}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section faq-section">
    <div class="container faq-grid">
      <div class="section-heading">
        <span class="eyebrow">{{ $t('home.faqEyebrow') }}</span>
        <h2>{{ $t('home.faqTitle') }}</h2>
      </div>
      <div class="faq-list">
        <details v-for="faq in faqs" :key="faq" :open="faq === 1">
          <summary>{{ $t(`home.faq${faq}Question`) }}</summary>
          <p>{{ $t(`home.faq${faq}Answer`) }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
