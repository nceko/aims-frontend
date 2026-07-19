<script setup lang="ts">
import { BarChart3, Boxes, ClipboardList, PackageSearch, Truck, Wrench } from '@lucide/vue'
import PageHeader from '@/components/common/PageHeader.vue'

const reports = [
  {
    title: 'Stock Balance',
    description: 'Posisi stok per gudang dan item.',
    icon: Boxes,
    path: '/api/v1/reports/stock-balances',
  },
  {
    title: 'Stock Movement',
    description: 'Riwayat pergerakan barang.',
    icon: PackageSearch,
    path: '/api/v1/reports/stock-movements',
  },
  {
    title: 'Delivery Orders',
    description: 'Laporan distribusi dan penerimaan.',
    icon: Truck,
    path: '/api/v1/reports/delivery-orders',
  },
  {
    title: 'Item Usage',
    description: 'Laporan pemakaian barang.',
    icon: ClipboardList,
    path: '/api/v1/reports/item-usages',
  },
  {
    title: 'Asset Valuation',
    description: 'Nilai dan penyusutan aset.',
    icon: Wrench,
    path: '/api/v1/reports/asset-valuation',
  },
  {
    title: 'Inventory Valuation',
    description: 'Nilai inventory berdasarkan costing.',
    icon: BarChart3,
    path: '/api/v1/reports/inventory-valuation',
  },
]
</script>

<template>
  <div class="page-stack">
    <PageHeader title="Reports" description="Pusat laporan operasional AIMS." />
    <div class="report-grid">
      <article v-for="report in reports" :key="report.title" class="report-card">
        <span><component :is="report.icon" :size="22" /></span>
        <div>
          <h2>{{ report.title }}</h2>
          <p>{{ report.description }}</p>
          <code>{{ report.path }}</code>
        </div>
      </article>
    </div>
  </div>
</template>
