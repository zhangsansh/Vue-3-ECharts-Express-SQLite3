<template>
  <div class="panel" :class="{ full }">
    <div class="panel-title" v-if="title">
      <span>{{ title }}</span>
      <slot name="extra" />
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  full: Boolean
})
</script>

<style scoped>
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.panel::before,
.panel::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid var(--cyan);
}
.panel::before {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}
.panel::after {
  right: 0;
  bottom: 0;
  border-left: none;
  border-top: none;
}
.panel-title {
  padding: 10px 14px 6px;
  font-size: 14px;
  color: #7fe9ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  letter-spacing: 1px;
}
.panel-body {
  flex: 1;
  min-height: 0;
  padding: 4px 8px 10px;
}
</style>
