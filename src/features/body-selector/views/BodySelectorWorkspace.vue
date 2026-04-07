<script setup>
import { computed } from "vue";
import BodyMap from "../components/BodyMap.vue";
import BodySiteInspector from "../components/BodySiteInspector.vue";
import BodySiteList from "../components/BodySiteList.vue";
import BodySymptomTemplatePanel from "../components/BodySymptomTemplatePanel.vue";
import {
  BODY_SELECTION_MODE_OPTIONS,
  BODY_SYMPTOM_TEMPLATES,
  resolveBodySiteLabel,
  getSymptomTemplateMeta,
} from "../data/bodySiteDictionary";
import { useBodySiteSelector } from "../composables/useBodySiteSelector";

defineOptions({
  name: "BodySelectorWorkspace",
});

const {
  activeSite,
  activeSiteCode,
  activeTemplate,
  activeTemplateId,
  applyTemplateToActiveSite,
  applyTemplateToAllSites,
  clearSites,
  markerPayload,
  removeSite,
  selectedCount,
  selectedSites,
  setActiveTemplate,
  selectionMode,
  setActiveSite,
  toggleSite,
  updateActiveSite,
} = useBodySiteSelector();

const structuredOutput = computed(() =>
  JSON.stringify(
    selectedSites.value.map((item) => ({
      ...item,
      siteLabel: resolveBodySiteLabel(item.siteCode),
      templateLabel: getSymptomTemplateMeta(item.templateId).label,
    })),
    null,
    2,
  ),
);

const summaryCards = computed(() => [
  { label: "默认模板", value: activeTemplate.value.label },
  { label: "当前模式", value: selectionMode.value === "single" ? "单部位" : "多部位" },
  { label: "已选部位", value: `${selectedCount.value} 个` },
  {
    label: "焦点部位",
    value: activeSite.value ? resolveBodySiteLabel(activeSite.value.siteCode) : "未选中",
  },
]);
</script>

<template>
  <section class="body-selector-workspace">
    <header class="body-selector-workspace__header">
      <div class="body-selector-workspace__copy">
        <p class="body-selector-workspace__eyebrow">Body Site Selector</p>
        <h2 class="body-selector-workspace__title">人体部位选择器</h2>
        <p class="body-selector-workspace__summary">
          用于把体表不适、皮肤异常、设备粘贴点等空间信息，快速转成结构化部位数据。
          当前工作台不依赖现有诊断、文书或监护模块，可作为后续独立能力复用。
        </p>
      </div>

      <div class="body-selector-workspace__toolbar">
        <ElRadioGroup v-model="selectionMode" size="large">
          <ElRadioButton
            v-for="option in BODY_SELECTION_MODE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </ElRadioButton>
        </ElRadioGroup>
        <ElButton :disabled="!selectedCount" @click="clearSites">清空选择</ElButton>
      </div>
    </header>

    <section class="body-selector-workspace__overview">
      <article
        v-for="item in summaryCards"
        :key="item.label"
        class="body-selector-workspace__stat-card"
      >
        <span class="body-selector-workspace__stat-label">{{ item.label }}</span>
        <strong class="body-selector-workspace__stat-value">{{ item.value }}</strong>
      </article>
    </section>

    <section class="body-selector-workspace__layout">
      <div class="body-selector-workspace__map-shell">
        <!-- 独立工作台先直接承载人体图，后续如果要改成弹层，只需要复用 BodyMap 与状态组合层。 -->
        <BodyMap
          :markers="markerPayload"
          :active-site-code="activeSiteCode"
          @toggle-site="toggleSite"
        />
      </div>

      <div class="body-selector-workspace__side-stack">
        <BodySymptomTemplatePanel
          :templates="BODY_SYMPTOM_TEMPLATES"
          :active-template-id="activeTemplateId"
          :active-site-code="activeSiteCode"
          :selected-count="selectedCount"
          @select-template="setActiveTemplate"
          @apply-template-to-active="applyTemplateToActiveSite"
          @apply-template-to-all="applyTemplateToAllSites"
        />

        <BodySiteList
          :items="selectedSites"
          :active-site-code="activeSiteCode"
          @focus-site="setActiveSite"
          @remove-site="removeSite"
        />

        <BodySiteInspector
          :site="activeSite"
          @update-site="updateActiveSite"
        />

        <section class="body-selector-workspace__output-card">
          <header class="body-selector-workspace__output-head">
            <div>
              <p class="body-selector-workspace__eyebrow body-selector-workspace__eyebrow--muted">
                Structured Output
              </p>
              <h3 class="body-selector-workspace__output-title">结构化结果</h3>
            </div>
            <ElTag type="info" effect="plain">JSON</ElTag>
          </header>

          <ElInput
            :model-value="structuredOutput"
            type="textarea"
            readonly
            :rows="14"
          />
        </section>
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.body-selector-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    padding: 24px 26px;
    border-radius: 28px;
    background:
      radial-gradient(circle at top right, rgba(191, 233, 255, 0.36) 0%, rgba(191, 233, 255, 0) 34%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 250, 255, 0.96) 100%);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  &__copy {
    max-width: 760px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(14, 116, 144, 0.88);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;

    &--muted {
      color: rgba(100, 116, 139, 0.88);
    }
  }

  &__title {
    margin: 10px 0 0;
    color: #0f172a;
    font-size: 28px;
  }

  &__summary {
    margin: 12px 0 0;
    color: rgba(30, 41, 59, 0.72);
    font-size: 14px;
    line-height: 1.8;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__overview {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  &__stat-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  &__stat-label {
    color: rgba(100, 116, 139, 0.86);
    font-size: 12px;
  }

  &__stat-value {
    color: #0f172a;
    font-size: 20px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(340px, 0.9fr);
    gap: 18px;
    min-height: 0;
  }

  &__map-shell,
  &__output-card {
    padding: 18px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  &__side-stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 0;
  }

  &__output-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  &__output-title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 18px;
  }
}

@media (max-width: 1200px) {
  .body-selector-workspace {
    &__overview,
    &__layout {
      grid-template-columns: 1fr;
    }
  }
}
</style>
