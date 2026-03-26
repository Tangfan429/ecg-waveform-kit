<script setup>
import { computed } from "vue";

defineOptions({
  name: "WatchHistorySelector",
});

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  selectedRecordId: {
    type: String,
    default: "",
  },
  selectedRecordLabel: {
    type: String,
    default: "",
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 12,
  },
  total: {
    type: Number,
    default: 0,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  isRefreshing: {
    type: Boolean,
    default: false,
  },
  deletingRecordId: {
    type: String,
    default: "",
  },
  hasPrevPage: {
    type: Boolean,
    default: false,
  },
  hasNextPage: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "update:selectedRecordId",
  "refresh",
  "show-latest",
  "change-page",
  "delete-record",
]);

const hasSelection = computed(() => Boolean(props.selectedRecordId));
const selectedRecord = computed(
  () => props.items.find((item) => item.id === props.selectedRecordId) || null,
);
const resolvedSelectedRecordLabel = computed(() => {
  const explicitLabel = String(props.selectedRecordLabel || "").trim();

  if (explicitLabel) {
    return explicitLabel;
  }

  return selectedRecord.value
    ? formatDateTimeLabel(selectedRecord.value.recordedAt)
    : "最新同步";
});
const totalPages = computed(() =>
  props.total > 0 ? Math.ceil(props.total / Math.max(1, props.pageSize)) : 1,
);
const rangeStart = computed(() =>
  props.total > 0 ? (props.page - 1) * props.pageSize + 1 : 0,
);
const rangeEnd = computed(() =>
  props.total > 0
    ? Math.min(props.total, rangeStart.value + props.items.length - 1)
    : 0,
);

function formatDateTimeLabel(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "--";
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue;
  }

  return parsedDate.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDurationLabel(value) {
  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return "--";
  }

  return `${duration.toFixed(duration >= 10 ? 0 : 1)}s`;
}

function formatHeartRateLabel(value) {
  const heartRate = Number(value);
  return Number.isFinite(heartRate) && heartRate > 0
    ? `${heartRate} bpm`
    : "--";
}

function handleSelectRecord(recordID) {
  emit("update:selectedRecordId", recordID);
}

function handleShowLatest() {
  emit("show-latest");
  emit("update:selectedRecordId", "");
}

function handleDeleteRecord(recordID) {
  emit("delete-record", recordID);
}
</script>

<template>
  <section class="watch-history-selector">
    <header class="watch-history-selector__header">
      <div>
        <div class="watch-history-selector__eyebrow">History Browser</div>
        <h3 class="watch-history-selector__title">历史心电</h3>
        <p class="watch-history-selector__subtitle">
          支持翻页浏览本地 SQLite 中的历史 ECG，并可删除不再需要的记录。
        </p>
      </div>

      <div class="watch-history-selector__actions">
        <button
          type="button"
          class="watch-history-selector__action watch-history-selector__action--primary"
          :class="{ 'watch-history-selector__action--active': !hasSelection }"
          @click="handleShowLatest"
        >
          最新同步
        </button>

        <button
          type="button"
          class="watch-history-selector__action"
          :disabled="isLoading || isRefreshing"
          @click="emit('refresh')"
        >
          {{ isLoading || isRefreshing ? "刷新中..." : "刷新列表" }}
        </button>
      </div>
    </header>

    <div class="watch-history-selector__meta">
      <span>当前浏览：{{ resolvedSelectedRecordLabel }}</span>
      <span>总记录：{{ total }} 条</span>
      <span>当前页：第 {{ page }} / {{ totalPages }} 页</span>
    </div>

    <p v-if="errorMessage" class="watch-history-selector__error">
      {{ errorMessage }}
    </p>

    <div v-if="items.length" class="watch-history-selector__list">
      <article
        v-for="item in items"
        :key="item.id"
        class="watch-history-selector__item"
        :class="{
          'watch-history-selector__item--active': item.id === selectedRecordId,
        }"
      >
        <button
          type="button"
          class="watch-history-selector__item-select"
          @click="handleSelectRecord(item.id)"
        >
          <div class="watch-history-selector__item-head">
            <strong>{{ formatDateTimeLabel(item.recordedAt) }}</strong>
            <span>{{ formatDurationLabel(item.duration) }}</span>
          </div>

          <div class="watch-history-selector__item-meta">
            <span>分类 {{ item.classification || "--" }}</span>
            <span>HR {{ formatHeartRateLabel(item.heartRate) }}</span>
            <span>导联 {{ item.leadName || "I" }}</span>
          </div>

          <div class="watch-history-selector__item-foot">
            <span>{{ item.deviceLabel || "Apple Watch" }}</span>
            <span>{{ item.sourceRecordId || item.id }}</span>
          </div>
        </button>

        <div class="watch-history-selector__item-actions">
          <button
            type="button"
            class="watch-history-selector__danger"
            :disabled="
              isLoading || isRefreshing || deletingRecordId === item.id
            "
            @click="handleDeleteRecord(item.id)"
          >
            {{ deletingRecordId === item.id ? "删除中..." : "删除" }}
          </button>
        </div>
      </article>
    </div>

    <div v-else class="watch-history-selector__empty">
      {{ isLoading ? "正在加载历史记录..." : "当前还没有可选的历史心电记录" }}
    </div>

    <footer v-if="total > 0" class="watch-history-selector__pagination">
      <span> 当前显示 {{ rangeStart }} - {{ rangeEnd }} / {{ total }} </span>

      <div class="watch-history-selector__pagination-actions">
        <button
          type="button"
          class="watch-history-selector__action"
          :disabled="!hasPrevPage || isLoading || isRefreshing"
          @click="emit('change-page', page - 1)"
        >
          上一页
        </button>

        <button
          type="button"
          class="watch-history-selector__action"
          :disabled="!hasNextPage || isLoading || isRefreshing"
          @click="emit('change-page', page + 1)"
        >
          下一页
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.watch-history-selector {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at right top,
      rgba(43, 164, 113, 0.08),
      transparent 24%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(246, 251, 249, 0.96) 100%
    );
}

.watch-history-selector__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.watch-history-selector__eyebrow {
  margin-bottom: 6px;
  color: rgba(43, 164, 113, 0.9);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.watch-history-selector__title {
  margin: 0;
  font-size: 22px;
}

.watch-history-selector__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.6);
  font-size: 13px;
  line-height: 1.55;
}

.watch-history-selector__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.watch-history-selector__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: rgba(15, 23, 42, 0.82);
  background: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;

  &:hover:enabled {
    border-color: rgba(43, 164, 113, 0.22);
    background: rgba(243, 251, 247, 0.96);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.watch-history-selector__action--primary,
.watch-history-selector__action--active {
  color: #ffffff;
  border-color: rgba(43, 164, 113, 0.18);
  background: linear-gradient(135deg, #177a4d 0%, #2ba471 100%);
}

.watch-history-selector__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
}

.watch-history-selector__error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
}

.watch-history-selector__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.watch-history-selector__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 148px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(43, 164, 113, 0.26);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
  }
}

.watch-history-selector__item--active {
  border-color: rgba(43, 164, 113, 0.22);
  background: linear-gradient(
    180deg,
    rgba(236, 250, 243, 0.98) 0%,
    rgba(255, 255, 255, 0.96) 100%
  );
  box-shadow: 0 14px 26px rgba(43, 164, 113, 0.12);
}

.watch-history-selector__item-select {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border: 0;
  color: rgba(15, 23, 42, 0.82);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.watch-history-selector__item-head,
.watch-history-selector__item-meta,
.watch-history-selector__item-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.watch-history-selector__item-head {
  strong {
    font-size: 14px;
  }

  span {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }
}

.watch-history-selector__item-meta,
.watch-history-selector__item-foot {
  color: rgba(15, 23, 42, 0.6);
  font-size: 12px;
}

.watch-history-selector__item-foot {
  margin-top: auto;
}

.watch-history-selector__item-actions {
  display: flex;
  justify-content: flex-end;
}

.watch-history-selector__danger {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 999px;
  color: #b42318;
  background: rgba(254, 242, 242, 0.94);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.watch-history-selector__empty {
  padding: 18px;
  border-radius: 18px;
  color: rgba(15, 23, 42, 0.56);
  background: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}

.watch-history-selector__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
}

.watch-history-selector__pagination-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .watch-history-selector__header {
    flex-direction: column;
  }

  .watch-history-selector__actions {
    width: 100%;
  }

  .watch-history-selector__action {
    flex: 1;
  }

  .watch-history-selector__list {
    grid-template-columns: 1fr;
  }

  .watch-history-selector__pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .watch-history-selector__pagination-actions {
    width: 100%;
  }

  .watch-history-selector__pagination-actions .watch-history-selector__action {
    flex: 1;
  }
}
</style>
