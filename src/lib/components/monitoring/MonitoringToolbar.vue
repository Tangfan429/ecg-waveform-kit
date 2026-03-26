<script setup>
defineOptions({
  name: "MonitoringToolbar",
});

const pausedModel = defineModel("paused", {
  type: Boolean,
  default: false,
});
const gridVisibleModel = defineModel("gridVisible", {
  type: Boolean,
  default: true,
});
const timeWindowModel = defineModel("timeWindow", {
  type: Number,
  default: 8,
});
const amplitudeScaleModel = defineModel("amplitudeScale", {
  type: Number,
  default: 1,
});
const scenarioKeyModel = defineModel("scenarioKey", {
  type: String,
  default: "",
});

defineProps({
  modeLabel: {
    type: String,
    default: "监护模式",
  },
  scenarioOptions: {
    type: Array,
    default: () => [],
  },
  zoomPercent: {
    type: Number,
    default: 100,
  },
  isFullscreen: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  "zoom-in",
  "zoom-out",
  "zoom-reset",
  "toggle-fullscreen",
  "print",
]);

const windowOptions = Object.freeze([
  { value: 6, label: "6s" },
  { value: 8, label: "8s" },
  { value: 10, label: "10s" },
  { value: 12, label: "12s" },
]);

const amplitudeOptions = Object.freeze([
  { value: 0.8, label: "0.8x" },
  { value: 1, label: "1.0x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
]);
</script>

<template>
  <section class="monitoring-toolbar">
    <div class="monitoring-toolbar__group">
      <span class="monitoring-toolbar__label">{{ modeLabel }}</span>

      <el-select
        v-model="scenarioKeyModel"
        class="monitoring-toolbar__select"
        size="large"
        placeholder="选择 mock 场景"
      >
        <el-option
          v-for="item in scenarioOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="timeWindowModel"
        class="monitoring-toolbar__compact"
        size="large"
      >
        <el-option
          v-for="item in windowOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="amplitudeScaleModel"
        class="monitoring-toolbar__compact"
        size="large"
      >
        <el-option
          v-for="item in amplitudeOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <div class="monitoring-toolbar__switch">
        <span>网格</span>
        <el-switch v-model="gridVisibleModel" />
      </div>
    </div>

    <div class="monitoring-toolbar__group monitoring-toolbar__group--actions">
      <button
        type="button"
        class="monitoring-toolbar__action"
        @click="pausedModel = !pausedModel"
      >
        {{ pausedModel ? "继续" : "暂停" }}
      </button>

      <button
        type="button"
        class="monitoring-toolbar__action"
        @click="$emit('zoom-out')"
      >
        缩小
      </button>

      <button
        type="button"
        class="monitoring-toolbar__action monitoring-toolbar__action--ghost"
        @click="$emit('zoom-reset')"
      >
        {{ Math.round(zoomPercent) }}%
      </button>

      <button
        type="button"
        class="monitoring-toolbar__action"
        @click="$emit('zoom-in')"
      >
        放大
      </button>

      <button
        type="button"
        class="monitoring-toolbar__action"
        @click="$emit('toggle-fullscreen')"
      >
        {{ isFullscreen ? "退出全屏" : "全屏" }}
      </button>

      <button
        type="button"
        class="monitoring-toolbar__action monitoring-toolbar__action--primary"
        @click="$emit('print')"
      >
        打印
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.monitoring-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);

  &__group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    &--actions {
      justify-content: flex-end;
    }
  }

  &__label {
    color: #0f172a;
    font-size: 13px;
    font-weight: 600;
  }

  &__select {
    width: 220px;
  }

  &__compact {
    width: 104px;
  }

  &__switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #475569;
    font-size: 13px;
  }

  &__action {
    height: 42px;
    padding: 0 14px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 14px;
    background: #ffffff;
    color: #0f172a;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(79, 124, 255, 0.32);
      box-shadow: 0 12px 28px rgba(79, 124, 255, 0.12);
    }

    &--ghost {
      color: #475569;
      background: rgba(248, 250, 252, 0.92);
    }

    &--primary {
      border-color: transparent;
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      color: #ffffff;
    }
  }
}

@media (max-width: 900px) {
  .monitoring-toolbar {
    &__select {
      width: 100%;
      max-width: 280px;
    }
  }
}
</style>
