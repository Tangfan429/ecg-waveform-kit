<template>
  <div class="analysis-type-tabs">
    <div
      v-for="tab in props.tabs"
      :key="tab.key"
      :class="['tab-item', { 'tab-item--active': activeTab === tab.key }]"
      @click="handleTabClick(tab.key)"
    >
      <div
        :class="[
          'tab-content',
          { 'tab-content--active': activeTab === tab.key },
        ]"
      >
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

defineOptions({
  name: "AnalysisTypeTabs",
});

const props = defineProps({
  modelValue: {
    type: String,
    default: "waveform",
  },
  tabs: {
    type: Array,
    default: () => [
      { key: "waveform", label: "波形分析" },
      { key: "template", label: "平均模板" },
      { key: "rhythm", label: "节律波形" },
      { key: "spectrum", label: "频谱心电" },
      { key: "highFreq", label: "高频心电" },
      { key: "qtDispersion", label: "QT离散度" },
      { key: "vector", label: "心电向量" },
    ],
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const activeTab = computed(() => props.modelValue);

const handleTabClick = (key) => {
  emit("update:modelValue", key);
  emit("change", key);
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.analysis-type-tabs {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 48px;
  background-color: $gray-white;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(53, 98, 236, 0.4) transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(53, 98, 236, 0.4);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.tab-item {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  height: 100%;
  padding: 0 12px;
  cursor: pointer;

  &:hover {
    .tab-label {
      color: $brand-7-normal;
    }
  }

  &--active {
    .tab-label {
      font-weight: 600;
      color: $brand-7-normal;
    }
  }
}

.tab-content {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 8px;
  transition: all 0.2s ease;

  &--active {
    border-bottom: 3px solid $brand-7-normal;
  }
}

.tab-label {
  font: $font-body-lg;
  color: $text-secondary;
  white-space: nowrap;
  transition: color 0.2s ease;
}
</style>