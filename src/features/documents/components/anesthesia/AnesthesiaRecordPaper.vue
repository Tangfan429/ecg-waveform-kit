<script setup>
import { computed } from "vue";
import { ANESTHESIA_PAGE_SIZE } from "../../utils/anesthesiaRecordLayout";
import { DEFAULT_DOCUMENT_PRINT_SETTINGS } from "../../utils/documentPretextLayout";
import {
  buildDocumentHeaderEntries,
  formatRecordValue,
} from "../../schemas/documentTemplates";
import AnesthesiaTrendChart from "./AnesthesiaTrendChart.vue";

defineOptions({
  name: "AnesthesiaRecordPaper",
});

const props = defineProps({
  page: { type: Object, default: null },
  template: { type: Object, default: null },
  record: { type: Object, default: () => ({}) },
  printSettings: { type: Object, default: () => ({}) },
  printedAt: { type: String, default: "--" },
});

const resolvedSettings = computed(() => ({
  ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
  ...(props.printSettings || {}),
}));

const headerEntries = computed(() =>
  buildDocumentHeaderEntries(props.template, props.record),
);

const headerChunks = computed(() => {
  const entries = headerEntries.value;
  const chunkSize = 4;
  const chunks = [];

  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(entries.slice(index, index + chunkSize));
  }

  return chunks;
});

const eventLaneGroups = computed(() =>
  ["麻醉事件", "气道管理", "手术事件"].map((laneTitle) => ({
    title: laneTitle,
    items: (props.page?.eventMarkers || []).filter(
      (marker) => marker.lane === laneTitle,
    ),
  })),
);

const timingItems = computed(() => [
  ["入室", props.record.entryRoomTime],
  ["麻醉开始", props.record.anesthesiaStartTime],
  ["手术开始", props.record.surgeryStartTime],
  ["手术结束", props.record.surgeryEndTime],
  ["麻醉结束", props.record.anesthesiaEndTime],
  ["出室", props.record.exitRoomTime],
]);

const pageStyles = computed(() => ({
  "--anesthesia-paper-width": `${ANESTHESIA_PAGE_SIZE.widthPx}px`,
  "--anesthesia-paper-height": `${ANESTHESIA_PAGE_SIZE.heightPx}px`,
  "--anesthesia-paper-padding-top": `${ANESTHESIA_PAGE_SIZE.paddingTopPx}px`,
  "--anesthesia-paper-padding-right": `${ANESTHESIA_PAGE_SIZE.paddingRightPx}px`,
  "--anesthesia-paper-padding-bottom": `${ANESTHESIA_PAGE_SIZE.paddingBottomPx}px`,
  "--anesthesia-paper-padding-left": `${ANESTHESIA_PAGE_SIZE.paddingLeftPx}px`,
}));
</script>

<template>
  <article class="anesthesia-record-paper" :style="pageStyles">
    <div
      v-if="resolvedSettings.showWatermark"
      class="anesthesia-record-paper__watermark"
    >
      {{ resolvedSettings.watermarkText }}
    </div>

    <template v-if="page?.kind === 'anesthesia-main'">
      <header class="anesthesia-record-paper__header">
        <div class="anesthesia-record-paper__masthead">
          <p class="anesthesia-record-paper__hospital">
            {{ formatRecordValue(record.hospitalName) }}
          </p>
          <div class="anesthesia-record-paper__title-wrap">
            <h3 class="anesthesia-record-paper__title">{{ template?.title }}</h3>
            <p class="anesthesia-record-paper__summary">{{ template?.summary }}</p>
          </div>
          <div class="anesthesia-record-paper__doc-meta">
            <span>编码：{{ template?.documentCode }}</span>
            <span>{{ `第 ${page.number} 页` }}</span>
          </div>
        </div>

        <div class="anesthesia-record-paper__header-stack">
          <div
            v-for="(chunk, chunkIndex) in headerChunks"
            :key="`header-chunk-${chunkIndex}`"
            class="anesthesia-record-paper__header-grid"
          >
            <div
              v-for="entry in chunk"
              :key="entry.key"
              class="anesthesia-record-paper__header-cell"
            >
              <span class="anesthesia-record-paper__header-label">{{ entry.label }}</span>
              <span class="anesthesia-record-paper__header-value">{{ entry.value }}</span>
            </div>
          </div>
        </div>

        <div class="anesthesia-record-paper__timing-strip">
          <div
            v-for="item in timingItems"
            :key="item[0]"
            class="anesthesia-record-paper__timing-card"
          >
            <span class="anesthesia-record-paper__timing-label">{{ item[0] }}</span>
            <strong class="anesthesia-record-paper__timing-value">
              {{ formatRecordValue(item[1]) }}
            </strong>
          </div>
        </div>
      </header>

      <section class="anesthesia-record-paper__chart-card">
        <div class="anesthesia-record-paper__section-head">
          <h4 class="anesthesia-record-paper__section-title">术中生命体征趋势</h4>
          <span class="anesthesia-record-paper__section-tip">
            脉搏曲线 + 收缩压 / 舒张压图示
          </span>
        </div>
        <AnesthesiaTrendChart
          :timeline-slots="page.timelineSlots"
          :trend-series="page.trendSeries"
        />
      </section>

      <section class="anesthesia-record-paper__aux-table-card">
        <div class="anesthesia-record-paper__section-head">
          <h4 class="anesthesia-record-paper__section-title">时间轴附加参数</h4>
          <span class="anesthesia-record-paper__section-tip">
            与主图时间刻度保持一致
          </span>
        </div>
        <table class="anesthesia-record-paper__aux-table">
          <tbody>
            <tr>
              <th>时间</th>
              <td v-for="point in page.trendSeries" :key="`time-${point.time}`">{{ point.time }}</td>
            </tr>
            <tr>
              <th>SpO2</th>
              <td v-for="point in page.trendSeries" :key="`spo2-${point.time}`">{{ formatRecordValue(point.spo2) }}</td>
            </tr>
            <tr>
              <th>ETCO2</th>
              <td v-for="point in page.trendSeries" :key="`etco2-${point.time}`">{{ formatRecordValue(point.etco2) }}</td>
            </tr>
            <tr>
              <th>呼吸</th>
              <td v-for="point in page.trendSeries" :key="`resp-${point.time}`">{{ formatRecordValue(point.respiration) }}</td>
            </tr>
            <tr>
              <th>体温</th>
              <td v-for="point in page.trendSeries" :key="`temp-${point.time}`">{{ formatRecordValue(point.temperature) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="anesthesia-record-paper__event-grid">
        <article
          v-for="lane in eventLaneGroups"
          :key="lane.title"
          class="anesthesia-record-paper__event-card"
        >
          <h5 class="anesthesia-record-paper__event-title">{{ lane.title }}</h5>
          <div
            v-for="(item, itemIndex) in lane.items.length ? lane.items : [{ time: '--', label: '--' }]"
            :key="`${lane.title}-${itemIndex}`"
            class="anesthesia-record-paper__event-item"
          >
            <span>{{ formatRecordValue(item.time) }}</span>
            <span>{{ formatRecordValue(item.label) }}</span>
          </div>
        </article>
      </section>

      <section class="anesthesia-record-paper__table-grid">
        <article class="anesthesia-record-paper__table-card">
          <div class="anesthesia-record-paper__section-head">
            <h4 class="anesthesia-record-paper__section-title">术中用药</h4>
            <span class="anesthesia-record-paper__section-tip">
              溢出内容自动转续页
            </span>
          </div>
          <table class="anesthesia-record-paper__table">
            <thead>
              <tr>
                <th>时间</th>
                <th>药品</th>
                <th>剂量</th>
                <th>单位</th>
                <th>途径</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in page.medications" :key="`medication-${rowIndex}`">
                <td>{{ formatRecordValue(row.time) }}</td>
                <td>{{ formatRecordValue(row.name) }}</td>
                <td>{{ formatRecordValue(row.dose) }}</td>
                <td>{{ formatRecordValue(row.unit) }}</td>
                <td>{{ formatRecordValue(row.route) }}</td>
                <td>{{ formatRecordValue(row.remark) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="anesthesia-record-paper__table-card">
          <div class="anesthesia-record-paper__section-head">
            <h4 class="anesthesia-record-paper__section-title">液体与出入量</h4>
            <span class="anesthesia-record-paper__section-tip">
              输入 / 输出合并记录
            </span>
          </div>
          <table class="anesthesia-record-paper__table">
            <thead>
              <tr>
                <th>时间</th>
                <th>项目</th>
                <th>数量</th>
                <th>单位</th>
                <th>类别</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in page.fluids" :key="`fluid-${rowIndex}`">
                <td>{{ formatRecordValue(row.time) }}</td>
                <td>{{ formatRecordValue(row.name) }}</td>
                <td>{{ formatRecordValue(row.volume) }}</td>
                <td>{{ formatRecordValue(row.unit) }}</td>
                <td>{{ formatRecordValue(row.kind) }}</td>
                <td>{{ formatRecordValue(row.remark) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </template>

    <template v-else>
      <header class="anesthesia-record-paper__header anesthesia-record-paper__header--note">
        <div class="anesthesia-record-paper__masthead anesthesia-record-paper__masthead--note">
          <p class="anesthesia-record-paper__hospital">
            {{ formatRecordValue(record.hospitalName) }}
          </p>
          <div class="anesthesia-record-paper__title-wrap">
            <h3 class="anesthesia-record-paper__title">{{ template?.title }}（续页）</h3>
          </div>
          <div class="anesthesia-record-paper__doc-meta">
            <span>编码：{{ template?.documentCode }}</span>
            <span>{{ `第 ${page.number} 页` }}</span>
          </div>
        </div>

        <div class="anesthesia-record-paper__header-grid">
          <div
            v-for="entry in headerEntries.slice(0, 8)"
            :key="entry.key"
            class="anesthesia-record-paper__header-cell"
          >
            <span class="anesthesia-record-paper__header-label">{{ entry.label }}</span>
            <span class="anesthesia-record-paper__header-value">{{ entry.value }}</span>
          </div>
        </div>
      </header>

      <section
        v-for="(table, tableIndex) in page.overflowTables || []"
        :key="`overflow-table-${tableIndex}`"
        class="anesthesia-record-paper__note-card"
      >
        <div class="anesthesia-record-paper__section-head">
          <h4 class="anesthesia-record-paper__section-title">{{ table.title }}</h4>
          <span class="anesthesia-record-paper__section-tip">续页承接主单溢出行</span>
        </div>
        <table class="anesthesia-record-paper__table anesthesia-record-paper__table--overflow">
          <thead>
            <tr>
              <th
                v-for="column in table.columns"
                :key="column"
              >
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in table.rows"
              :key="`overflow-row-${rowIndex}`"
            >
              <td
                v-for="(cell, cellIndex) in row"
                :key="`overflow-cell-${rowIndex}-${cellIndex}`"
              >
                {{ cell }}
              </td>
            </tr>
            <tr
              v-for="blankIndex in table.blankRowCount"
              :key="`overflow-blank-${blankIndex}`"
              class="anesthesia-record-paper__blank-row"
            >
              <td
                v-for="column in table.columns"
                :key="`overflow-blank-cell-${blankIndex}-${column}`"
              >
                &nbsp;
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        v-for="section in page.sections || []"
        :key="section.key"
        class="anesthesia-record-paper__note-card"
      >
        <h4 class="anesthesia-record-paper__section-title">{{ section.title }}</h4>
        <div
          v-for="(line, lineIndex) in section.lines"
          :key="`${section.key}-${lineIndex}`"
          class="anesthesia-record-paper__note-line"
        >
          {{ line }}
        </div>
      </section>

      <section v-if="page.signoff" class="anesthesia-record-paper__signoff">
        <div class="anesthesia-record-paper__signoff-item">
          <span class="anesthesia-record-paper__signoff-label">麻醉医师</span>
          <strong class="anesthesia-record-paper__signoff-value">{{ page.signoff.doctor }}</strong>
        </div>
        <div class="anesthesia-record-paper__signoff-item">
          <span class="anesthesia-record-paper__signoff-label">审核医师</span>
          <strong class="anesthesia-record-paper__signoff-value">{{ page.signoff.reviewer }}</strong>
        </div>
        <div class="anesthesia-record-paper__signoff-item">
          <span class="anesthesia-record-paper__signoff-label">签署时间</span>
          <strong class="anesthesia-record-paper__signoff-value">{{ page.signoff.signedDate }}</strong>
        </div>
      </section>
    </template>

    <footer class="anesthesia-record-paper__footer">
      <span>编码：{{ template?.documentCode }}</span>
      <span>
        {{ resolvedSettings.showPrintTime ? `打印时间：${printedAt}` : "麻醉记录单打印预览" }}
      </span>
      <span>{{ resolvedSettings.showPageNumber ? `第 ${page?.number} 页` : "" }}</span>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.anesthesia-record-paper {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--anesthesia-paper-width);
  min-height: var(--anesthesia-paper-height);
  padding: var(--anesthesia-paper-padding-top) var(--anesthesia-paper-padding-right)
    var(--anesthesia-paper-padding-bottom) var(--anesthesia-paper-padding-left);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.14);
  overflow: hidden;

  &__watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(15, 23, 42, 0.04);
    font-size: 88px;
    font-weight: 700;
    transform: rotate(-22deg);
    pointer-events: none;
  }

  &__header {
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.14);

    &--note {
      padding-bottom: 10px;
    }
  }

  &__masthead {
    display: grid;
    grid-template-columns: 240px 1fr 180px;
    align-items: center;
    gap: 12px;
  }

  &__masthead--note {
    grid-template-columns: 240px 1fr 180px;
  }

  &__hospital {
    margin: 0;
    color: rgba(15, 23, 42, 0.66);
    font-family: "SimSun", "Songti SC", serif;
    font-size: 14px;
  }

  &__title {
    margin: 0;
    text-align: center;
    font-size: 24px;
    font-family: "SimSun", "Songti SC", serif;
    letter-spacing: 0.06em;
  }

  &__summary {
    margin: 4px 0 0;
    text-align: center;
    font-size: 12px;
    color: rgba(15, 23, 42, 0.58);
  }

  &__doc-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
    color: rgba(15, 23, 42, 0.56);
    font-size: 12px;
  }

  &__header-stack {
    display: grid;
    gap: 6px;
    margin-top: 10px;
  }

  &__header-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px 10px;
  }

  &__header-cell {
    display: flex;
    gap: 6px;
    min-width: 0;
    font-family: "SimSun", "Songti SC", serif;
    font-size: 12px;
    line-height: 1.45;
  }

  &__header-label {
    color: rgba(0, 0, 0, 0.54);
    flex-shrink: 0;
  }

  &__header-value {
    min-width: 0;
  }

  &__timing-strip {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
  }

  &__timing-card {
    padding: 7px 8px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 12px;
    background: rgba(248, 251, 255, 0.96);
  }

  &__timing-label {
    display: block;
    font-size: 11px;
    color: rgba(15, 23, 42, 0.52);
  }

  &__timing-value {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    font-weight: 600;
  }

  &__chart-card,
  &__aux-table-card,
  &__table-card,
  &__note-card {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255, 255, 255, 0.96);
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__section-title {
    margin: 0;
    color: #0f172a;
    font-size: 14px;
  }

  &__section-tip {
    color: rgba(15, 23, 42, 0.52);
    font-size: 11px;
  }

  &__aux-table,
  &__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;

    th,
    td {
      padding: 5px 4px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: left;
      vertical-align: top;
    }
  }

  &__aux-table th {
    width: 72px;
    color: rgba(15, 23, 42, 0.56);
    font-weight: 600;
  }

  &__event-grid,
  &__table-grid,
  &__signoff {
    display: grid;
    gap: 10px;
  }

  &__event-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 10px;
  }

  &__event-card {
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(248, 251, 255, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.16);
  }

  &__event-title {
    margin: 0 0 6px;
    font-size: 12px;
  }

  &__event-item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    line-height: 1.55;
  }

  &__table-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__table--overflow thead th {
    background: rgba(248, 251, 255, 0.96);
  }

  &__blank-row td {
    height: 26px;
    color: transparent;
  }

  &__note-line {
    min-height: 24px;
    font-family: "SimSun", "Songti SC", serif;
    font-size: 14px;
    line-height: 24px;
    border-bottom: 1px dashed rgba(148, 163, 184, 0.14);
  }

  &__signoff {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 12px;
  }

  &__signoff-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__signoff-label {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }

  &__signoff-value {
    min-height: 24px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.18);
    font-size: 14px;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid rgba(15, 23, 42, 0.14);
    color: rgba(15, 23, 42, 0.56);
    font-size: 12px;
  }
}

@media (max-width: 1200px) {
  .anesthesia-record-paper {
    &__masthead,
    &__header-grid,
    &__timing-strip,
    &__event-grid,
    &__table-grid,
    &__signoff {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
