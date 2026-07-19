<script setup lang="ts">
import { ShieldX } from '@lucide/vue'
</script>
<template>
  <div class="state-page">
    <span><ShieldX :size="42" /></span>
    <h1>Akses tidak diizinkan</h1>
    <p>Akun Anda tidak memiliki permission untuk membuka halaman ini pada context aktif.</p>
    <RouterLink class="app-button app-button--primary" to="/">Kembali ke Dashboard</RouterLink>
  </div>
</template>
