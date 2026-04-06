<script setup>
import { computed, ref } from "vue";

defineOptions({
  name: "DocumentEditorPanel",
});

const props = defineProps({
  template: {
    type: Object,
    default: null,
  },
  record: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update-field"]);

const activeTab = ref("meta");

const groupedFields = computed(() =>
  (props.template?.editorGroups || []).map((group) => ({
    ...group,
    fields: (props.template?.fields || []).filter(
      (field) => field.group === group.key,
    ),
  })),
);

const handleFieldUpdate = (fieldKey, value) => {
  emit("update-field", {
    key: fieldKey,
    value,
  });
};
</script>

<template>
  <section class="document-editor-panel">
    <header class="document-editor-panel__header">
      <div>
        <p class="document-editor-panel__eyebrow">Editor</p>
        <h3 class="document-editor-panel__title">{{ template?.title }}</h3>
      </div>
      <ElTag type="info" effect="plain">
        共 {{ template?.sectionFields?.length || 0 }} 个正文区块
      </ElTag>
    </header>

    <ElTabs v-model="activeTab" class="document-editor-panel__tabs">
      <ElTabPane label="基础信息" name="meta">
        <div class="document-editor-panel__groups">
          <section
            v-for="group in groupedFields"
            :key="group.key"
            class="document-editor-panel__group"
          >
            <header class="document-editor-panel__group-head">
              <h4 class="document-editor-panel__group-title">{{ group.title }}</h4>
            </header>

            <ElForm label-position="top" class="document-editor-panel__form">
              <div class="document-editor-panel__grid">
                <ElFormItem
                  v-for="field in group.fields"
                  :key="field.key"
                  :label="field.label"
                  :class="[
                    'document-editor-panel__field',
                    `document-editor-panel__field--span-${field.span || 24}`,
                  ]"
                >
                  <ElSelect
                    v-if="field.type === 'select'"
                    :model-value="record[field.key]"
                    placeholder="请选择"
                    @update:model-value="handleFieldUpdate(field.key, $event)"
                  >
                    <ElOption
                      v-for="option in field.options || []"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </ElSelect>

                  <ElDatePicker
                    v-else-if="field.type === 'date'"
                    :model-value="record[field.key]"
                    type="date"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    placeholder="请选择日期"
                    style="width: 100%;"
                    @update:model-value="handleFieldUpdate(field.key, $event)"
                  />

                  <ElDatePicker
                    v-else-if="field.type === 'datetime'"
                    :model-value="record[field.key]"
                    type="datetime"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    placeholder="请选择日期时间"
                    style="width: 100%;"
                    @update:model-value="handleFieldUpdate(field.key, $event)"
                  />

                  <ElInput
                    v-else
                    :model-value="record[field.key]"
                    :placeholder="`请输入${field.label}`"
                    @update:model-value="handleFieldUpdate(field.key, $event)"
                  />
                </ElFormItem>
              </div>
            </ElForm>
          </section>
        </div>
      </ElTabPane>

      <ElTabPane label="正文内容" name="content">
        <section
          v-for="section in template?.sectionFields || []"
          :key="section.key"
          class="document-editor-panel__section"
        >
          <header class="document-editor-panel__section-head">
            <div>
              <h4 class="document-editor-panel__section-title">{{ section.label }}</h4>
              <p class="document-editor-panel__section-help">
                {{ section.placeholder }}
              </p>
            </div>
            <ElTag type="info" effect="plain">
              {{ String(record[section.key] || "").trim().length }} 字
            </ElTag>
          </header>

          <ElInput
            :model-value="record[section.key]"
            type="textarea"
            resize="vertical"
            :rows="section.rows || 5"
            :placeholder="section.placeholder"
            @update:model-value="handleFieldUpdate(section.key, $event)"
          />
        </section>
      </ElTabPane>
    </ElTabs>
  </section>
</template>

<style scoped lang="scss">
.document-editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(43, 164, 113, 0.84);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 20px;
  }

  &__tabs {
    flex: 1;
    min-height: 0;
  }

  &__groups,
  &__section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__groups {
    gap: 18px;
  }

  &__group {
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(248, 251, 255, 0.96) 0%, rgba(255, 255, 255, 1) 100%);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  &__group-head {
    margin-bottom: 12px;
  }

  &__group-title,
  &__section-title {
    margin: 0;
    color: #0f172a;
    font-size: 15px;
  }

  &__form {
    width: 100%;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(24, minmax(0, 1fr));
    gap: 10px 12px;
  }

  &__field {
    margin-bottom: 0;

    &--span-8 {
      grid-column: span 8;
    }

    &--span-12 {
      grid-column: span 12;
    }

    &--span-24 {
      grid-column: span 24;
    }
  }

  &__section {
    margin-top: 14px;
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(248, 251, 255, 0.92) 0%, rgba(255, 255, 255, 1) 100%);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  &__section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__section-help {
    margin: 8px 0 0;
    color: rgba(15, 23, 42, 0.56);
    font-size: 12px;
    line-height: 1.6;
  }
}

@media (max-width: 900px) {
  .document-editor-panel {
    &__field--span-8,
    &__field--span-12,
    &__field--span-24 {
      grid-column: span 24;
    }

    &__header,
    &__section-head {
      flex-direction: column;
      align-items: stretch;
    }
  }
}
</style>
