<script setup>
import { computed } from "vue";
import {
  getBodyTagMeta,
  getSymptomTemplateMeta,
  resolveBodySiteLabel,
} from "../data/bodySiteDictionary";

defineOptions({
  name: "BodySiteList",
});

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeSiteCode: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["focus-site", "remove-site"]);

const resolvedItems = computed(() =>
  props.items.map((item) => ({
    ...item,
    label: resolveBodySiteLabel(item.siteCode),
    accent: getBodyTagMeta(item.tags?.[0] || "other"),
    templateLabel: getSymptomTemplateMeta(item.templateId).label,
  })),
);
</script>

<template>
  <section class="body-site-list">
    <header class="body-site-list__header">
      <div>
        <p class="body-site-list__eyebrow">Selection</p>
        <h3 class="body-site-list__title">已选部位</h3>
      </div>
      <ElTag type="info" effect="plain">
        {{ resolvedItems.length }} 项
      </ElTag>
    </header>

    <ElEmpty
      v-if="!resolvedItems.length"
      description="点击人体图任意部位开始记录"
      :image-size="86"
    />

    <div v-else class="body-site-list__stack">
      <article
        v-for="item in resolvedItems"
        :key="item.siteCode"
        class="body-site-list__card"
        :class="{
          'body-site-list__card--active': item.siteCode === activeSiteCode,
        }"
        @click="emit('focus-site', item.siteCode)"
      >
        <div class="body-site-list__card-head">
          <div>
            <strong class="body-site-list__card-title">{{ item.label }}</strong>
            <p class="body-site-list__card-code">{{ item.siteCode }}</p>
          </div>
          <button
            type="button"
            class="body-site-list__remove"
            @click.stop="emit('remove-site', item.siteCode)"
          >
            移除
          </button>
        </div>

        <div class="body-site-list__meta">
          <ElTag size="small" type="info" effect="plain">
            {{ item.templateLabel }}
          </ElTag>
          <ElTag
            v-for="tag in item.tags"
            :key="tag"
            size="small"
            effect="plain"
            :style="{
              borderColor: item.accent.stroke,
              color: item.accent.stroke,
            }"
          >
            {{ getBodyTagMeta(tag).label }}
          </ElTag>
          <span class="body-site-list__severity">强度 {{ item.severity }}/5</span>
        </div>

        <p v-if="item.note" class="body-site-list__note">{{ item.note }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.body-site-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(14, 116, 144, 0.84);
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

  &__stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(14, 116, 144, 0.24);
      box-shadow: 0 14px 26px rgba(14, 116, 144, 0.08);
    }

    &--active {
      border-color: rgba(2, 132, 199, 0.28);
      box-shadow: 0 16px 28px rgba(2, 132, 199, 0.12);
    }
  }

  &__card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__card-title {
    color: #0f172a;
    font-size: 15px;
  }

  &__card-code {
    margin: 6px 0 0;
    color: rgba(100, 116, 139, 0.9);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 11px;
  }

  &__remove {
    padding: 0;
    border: 0;
    background: transparent;
    color: #dc2626;
    cursor: pointer;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  &__severity {
    color: rgba(15, 23, 42, 0.62);
    font-size: 12px;
  }

  &__note {
    margin: 0;
    color: rgba(30, 41, 59, 0.72);
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>
