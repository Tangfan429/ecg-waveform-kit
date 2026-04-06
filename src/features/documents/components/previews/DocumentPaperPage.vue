<script setup>
import { computed } from "vue";
import {
  DEFAULT_DOCUMENT_PRINT_SETTINGS,
  DOCUMENT_PAGE_SIZE,
} from "../../utils/documentPretextLayout";
import {
  buildDocumentHeaderEntries,
  formatRecordValue,
} from "../../schemas/documentTemplates";

defineOptions({
  name: "DocumentPaperPage",
});

const props = defineProps({
  page: {
    type: Object,
    default: null,
  },
  template: {
    type: Object,
    default: null,
  },
  record: {
    type: Object,
    default: () => ({}),
  },
  printSettings: {
    type: Object,
    default: () => ({}),
  },
  printedAt: {
    type: String,
    default: "--",
  },
});

const resolvedSettings = computed(() => ({
  ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
  ...(props.printSettings || {}),
}));

const headerEntries = computed(() =>
  buildDocumentHeaderEntries(props.template, props.record),
);

const pageStyles = computed(() => ({
  "--document-line-height": `${resolvedSettings.value.lineHeight}px`,
  "--document-body-font-size": `${resolvedSettings.value.bodyFontSize}px`,
  "--document-page-width": `${DOCUMENT_PAGE_SIZE.widthPx}px`,
  "--document-page-height": `${DOCUMENT_PAGE_SIZE.heightPx}px`,
  "--document-page-padding-top": `${DOCUMENT_PAGE_SIZE.paddingTopPx}px`,
  "--document-page-padding-right": `${DOCUMENT_PAGE_SIZE.paddingRightPx}px`,
  "--document-page-padding-bottom": `${DOCUMENT_PAGE_SIZE.paddingBottomPx}px`,
  "--document-page-padding-left": `${DOCUMENT_PAGE_SIZE.paddingLeftPx}px`,
}));
</script>

<template>
  <article class="document-paper-page" :style="pageStyles">
    <div
      v-if="resolvedSettings.showWatermark"
      class="document-paper-page__watermark"
    >
      {{ resolvedSettings.watermarkText }}
    </div>

    <header class="document-paper-page__header">
      <p class="document-paper-page__eyebrow">
        {{ formatRecordValue(record.hospitalName) }}
      </p>
      <h3 class="document-paper-page__title">{{ template?.title }}</h3>
      <p class="document-paper-page__summary">{{ template?.summary }}</p>

      <div class="document-paper-page__header-grid">
        <div
          v-for="entry in headerEntries"
          :key="entry.key"
          class="document-paper-page__header-cell"
        >
          <span class="document-paper-page__header-label">{{ entry.label }}</span>
          <span class="document-paper-page__header-value">{{ entry.value }}</span>
        </div>
      </div>
    </header>

    <div class="document-paper-page__body">
      <section
        v-for="section in page?.sections || []"
        :key="`${page.number}-${section.key}-${section.title}`"
        class="document-paper-page__section"
      >
        <header class="document-paper-page__section-title">
          {{ section.title }}
        </header>
        <div class="document-paper-page__section-lines">
          <div
            v-for="(line, lineIndex) in section.lines"
            :key="`${section.key}-${lineIndex}`"
            class="document-paper-page__line"
          >
            {{ line }}
          </div>
        </div>
      </section>

      <section
        v-if="page?.signoff"
        class="document-paper-page__signoff"
      >
        <div class="document-paper-page__signoff-item">
          <span class="document-paper-page__signoff-label">
            {{ page.signoff.authorLabel }}
          </span>
          <strong class="document-paper-page__signoff-value">
            {{ page.signoff.authorName }}
          </strong>
        </div>
        <div class="document-paper-page__signoff-item">
          <span class="document-paper-page__signoff-label">
            {{ page.signoff.reviewerLabel }}
          </span>
          <strong class="document-paper-page__signoff-value">
            {{ page.signoff.reviewerName }}
          </strong>
        </div>
        <div class="document-paper-page__signoff-item">
          <span class="document-paper-page__signoff-label">确认时间</span>
          <strong class="document-paper-page__signoff-value">
            {{ page.signoff.signedDate }}
          </strong>
        </div>
      </section>
    </div>

    <footer class="document-paper-page__footer">
      <span>编码：{{ template?.documentCode }}</span>
      <span>
        {{ resolvedSettings.showPrintTime ? `打印时间：${printedAt}` : "病历打印预览" }}
      </span>
      <span>{{ resolvedSettings.showPageNumber ? `第 ${page?.number} 页` : "" }}</span>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.document-paper-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--document-page-width);
  min-height: var(--document-page-height);
  padding: var(--document-page-padding-top) var(--document-page-padding-right)
    var(--document-page-padding-bottom) var(--document-page-padding-left);
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
    color: rgba(15, 23, 42, 0.05);
    font-size: 84px;
    font-weight: 700;
    transform: rotate(-24deg);
    user-select: none;
    pointer-events: none;
  }

  &__header {
    height: 182px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.14);
  }

  &__eyebrow {
    margin: 0 0 10px;
    color: rgba(15, 23, 42, 0.48);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-family: "SimSun", "Songti SC", serif;
    font-size: 30px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.08em;
  }

  &__summary {
    margin: 8px 0 0;
    color: rgba(15, 23, 42, 0.62);
    font-size: 13px;
    text-align: center;
  }

  &__header-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px 12px;
    margin-top: 18px;
  }

  &__header-cell {
    display: flex;
    gap: 8px;
    min-width: 0;
    font-family: "SimSun", "Songti SC", serif;
    font-size: 13px;
    line-height: 1.5;
  }

  &__header-label {
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.54);
  }

  &__header-value {
    min-width: 0;
  }

  &__body {
    flex: 1;
    padding-top: 18px;
  }

  &__section + &__section {
    margin-top: 14px;
  }

  &__section-title {
    height: 30px;
    padding: 0 12px;
    border-left: 4px solid #2f6fed;
    background: linear-gradient(90deg, rgba(47, 111, 237, 0.1) 0%, rgba(47, 111, 237, 0) 100%);
    font-family: "SimSun", "Songti SC", serif;
    font-size: 15px;
    font-weight: 700;
    line-height: 30px;
  }

  &__section-lines {
    padding-top: 8px;
  }

  &__line {
    height: var(--document-line-height);
    font-family: "SimSun", "Songti SC", serif;
    font-size: var(--document-body-font-size);
    line-height: var(--document-line-height);
    white-space: nowrap;
    overflow: hidden;
  }

  &__signoff {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(248, 250, 255, 0.94) 0%, rgba(255, 255, 255, 1) 100%);
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
    font-family: "SimSun", "Songti SC", serif;
    font-size: 14px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid rgba(15, 23, 42, 0.14);
    color: rgba(15, 23, 42, 0.56);
    font-size: 12px;
  }
}

@media (max-width: 960px) {
  .document-paper-page {
    &__header-grid,
    &__signoff {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
