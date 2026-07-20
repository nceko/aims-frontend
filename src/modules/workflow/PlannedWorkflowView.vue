<script setup lang="ts">
import { ArrowRight, CheckCircle2, Database, LayoutTemplate } from '@lucide/vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'

defineProps<{
  title: string
  description: string
  statusText?: string
  steps: string[]
  fields: string[]
  backendNeeds: string[]
  relatedRoute?: string
  relatedLabel?: string
}>()
</script>

<template>
  <div class="page-stack">
    <PageHeader :title="title" :description="description" />

    <div class="notice notice--info workflow-readiness-notice">
      <LayoutTemplate :size="18" />
      <div>
        <strong>Struktur frontend sudah disiapkan</strong>
        <span>{{
          statusText || 'Fungsi penyimpanan akan diaktifkan setelah endpoint backend tersedia.'
        }}</span>
      </div>
    </div>

    <div class="workflow-planning-grid">
      <AppCard title="Flow Pengguna" subtitle="Urutan proses yang akan digunakan pada halaman ini.">
        <ol class="workflow-step-list">
          <li v-for="(step, index) in steps" :key="step">
            <span>{{ index + 1 }}</span>
            <div>
              <strong>{{ step }}</strong>
            </div>
          </li>
        </ol>
      </AppCard>

      <AppCard
        title="Data Form"
        subtitle="Field utama yang sudah ditetapkan untuk implementasi backend."
      >
        <div class="workflow-field-grid">
          <span v-for="field in fields" :key="field"><CheckCircle2 :size="15" /> {{ field }}</span>
        </div>
      </AppCard>
    </div>

    <AppCard
      title="Kebutuhan Backend"
      subtitle="Kontrak API yang perlu dibuat pada tahap backend berikutnya."
    >
      <ul class="workflow-backend-list">
        <li v-for="need in backendNeeds" :key="need"><Database :size="16" /> {{ need }}</li>
      </ul>
      <RouterLink v-if="relatedRoute" class="workflow-related-link" :to="relatedRoute">
        {{ relatedLabel || 'Buka modul terkait' }} <ArrowRight :size="16" />
      </RouterLink>
    </AppCard>
  </div>
</template>
