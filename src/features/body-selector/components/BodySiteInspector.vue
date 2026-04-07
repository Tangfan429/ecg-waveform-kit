<script setup>
import { computed } from "vue";
import {
  BODY_TAG_OPTIONS,
  getSymptomTemplateMeta,
  resolveBodySiteLabel,
} from "../data/bodySiteDictionary";

defineOptions({
  name: "BodySiteInspector",
});

const props = defineProps({
  site: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update-site"]);

const severityMarks = Object.freeze({
  1: "轻",
  3: "中",
  5: "重",
});

const selectedTagValues = computed({
  get: () => props.site?.tags || [],
  set: (value) => emit("update-site", { tags: value }),
});

const severityValue = computed({
  get: () => props.site?.severity ?? 3,
  set: (value) => emit("update-site", { severity: value }),
});

const noteValue = computed({
  get: () => props.site?.note || "",
  set: (value) => emit("update-site", { note: value }),
});

const resolvedSiteLabel = computed(() =>
  props.site?.siteCode ? resolveBodySiteLabel(props.site.siteCode) : "",
);

const resolvedTemplateLabel = computed(() =>
  props.site?.templateId ? getSymptomTemplateMeta(props.site.templateId).label : "",
);
</script>

<template>
  <section class="body-site-inspector">
    <header class="body-site-inspector__header">
      <div>
        <p class="body-site-inspector__eyebrow">Inspector</p>
        <h3 class="body-site-inspector__title">部位属性</h3>
      </div>
      <ElTag v-if="site" type="success" effect="plain">
        当前编辑
      </ElTag>
    </header>

    <ElEmpty
      v-if="!site"
      description="选中一个部位后可补充标签、强度和备注"
      :image-size="86"
    />

    <ElForm v-else label-position="top" class="body-site-inspector__form">
      <ElFormItem label="当前部位">
        <div class="body-site-inspector__site-badge">
          <strong>{{ resolvedSiteLabel }}</strong>
          <span>{{ site.siteCode }}</span>
        </div>
      </ElFormItem>

      <ElFormItem label="来源模板">
        <ElTag type="info" effect="plain">
          {{ resolvedTemplateLabel || "未指定模板" }}
        </ElTag>
      </ElFormItem>

      <ElFormItem label="症状标签">
        <ElCheckboxGroup v-model="selectedTagValues" class="body-site-inspector__tags">
          <ElCheckbox
            v-for="tag in BODY_TAG_OPTIONS"
            :key="tag.value"
            :value="tag.value"
          >
            {{ tag.label }}
          </ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>

      <ElFormItem label="主观强度">
        <ElSlider
          v-model="severityValue"
          :min="1"
          :max="5"
          :step="1"
          :marks="severityMarks"
          show-stops
        />
      </ElFormItem>

      <ElFormItem label="备注">
        <ElInput
          v-model="noteValue"
          type="textarea"
          resize="vertical"
          :rows="5"
          placeholder="可记录起始时间、诱因、范围变化或补充说明"
        />
      </ElFormItem>
    </ElForm>
  </section>
</template>

<style scoped lang="scss">
.body-site-inspector {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(180, 83, 9, 0.84);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 18px;
  }

  &__form {
    padding: 16px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.16);
  }

  &__site-badge {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(241, 245, 249, 0.96) 0%, rgba(255, 255, 255, 1) 100%);

    span {
      color: rgba(100, 116, 139, 0.88);
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-size: 11px;
    }
  }

  &__tags {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 12px;
  }
}
</style>
