<script setup>
import { computed } from "vue";

defineOptions({
  name: "WatchAiAnalysisCard",
});

const props = defineProps({
  recordId: {
    type: String,
    default: "",
  },
  recordedAt: {
    type: String,
    default: "",
  },
  classification: {
    type: String,
    default: "",
  },
  heartRateLabel: {
    type: String,
    default: "--",
  },
  isGatewayConfigured: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  hasResult: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: "",
  },
  advisory: {
    type: String,
    default: "",
  },
  analysis: {
    type: Object,
    default: null,
  },
  provider: {
    type: String,
    default: "",
  },
  model: {
    type: String,
    default: "",
  },
  createdAt: {
    type: String,
    default: "",
  },
  rawText: {
    type: String,
    default: "",
  },
});

defineEmits(["analyze"]);

const riskLevelLabel = computed(() => {
  const normalizedValue = String(props.analysis?.riskLevel || "").trim();
  const labelMap = {
    low: "低风险提示",
    moderate: "中等风险提示",
    high: "高风险提示",
    unknown: "风险待定",
  };

  return labelMap[normalizedValue] || "风险待定";
});

const riskLevelClassName = computed(() => {
  const normalizedValue = String(props.analysis?.riskLevel || "").trim();
  return normalizedValue
    ? `watch-ai-analysis-card__risk--${normalizedValue}`
    : "";
});

const hasStructuredSections = computed(
  () =>
    Boolean(props.analysis?.summary) ||
    Boolean(props.analysis?.rhythmAssessment) ||
    Array.isArray(props.analysis?.keyFindings) ||
    Array.isArray(props.analysis?.diagnosticSuggestions) ||
    Array.isArray(props.analysis?.recommendedActions),
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
</script>

<template>
  <section class="watch-ai-analysis-card">
    <header class="watch-ai-analysis-card__header">
      <div>
        <div class="watch-ai-analysis-card__eyebrow">LLM Advisory</div>
        <h3 class="watch-ai-analysis-card__title">AI 辅助分析</h3>
        <p class="watch-ai-analysis-card__subtitle">
          由前端直接适配第三方 OpenAI 兼容网关，对当前 Lead I 单导联 ECG
          做辅助解读。
        </p>
      </div>

      <button
        type="button"
        class="watch-ai-analysis-card__action"
        :disabled="!recordId || !isGatewayConfigured || isLoading"
        @click="$emit('analyze')"
      >
        {{ isLoading ? "分析中..." : "分析当前心电" }}
      </button>
    </header>

    <div class="watch-ai-analysis-card__meta">
      <span>记录时间：{{ formatDateTimeLabel(recordedAt) }}</span>
      <span>当前分类：{{ classification || "--" }}</span>
      <span>心率：{{ heartRateLabel }}</span>
    </div>

    <p v-if="errorMessage" class="watch-ai-analysis-card__error">
      {{ errorMessage }}
    </p>

    <div v-if="!recordId" class="watch-ai-analysis-card__empty">
      当前还没有可分析的 ECG 记录。
    </div>

    <div v-else-if="!isGatewayConfigured" class="watch-ai-analysis-card__empty">
      请先在上方填写并保存 AI 网关配置。
    </div>

    <div v-else-if="hasResult" class="watch-ai-analysis-card__content">
      <div class="watch-ai-analysis-card__summary">
        <span class="watch-ai-analysis-card__risk" :class="riskLevelClassName">
          {{ riskLevelLabel }}
        </span>

        <p class="watch-ai-analysis-card__summary-text">
          {{ analysis?.summary || "模型未返回结构化摘要。" }}
        </p>

        <div class="watch-ai-analysis-card__provider">
          <span>Provider {{ provider || "--" }}</span>
          <span>Model {{ model || "--" }}</span>
          <span>生成时间 {{ formatDateTimeLabel(createdAt) }}</span>
        </div>
      </div>

      <div v-if="hasStructuredSections" class="watch-ai-analysis-card__grid">
        <article class="watch-ai-analysis-card__panel">
          <h4>节律判断</h4>
          <p>{{ analysis?.rhythmAssessment || "未返回。" }}</p>
        </article>

        <article class="watch-ai-analysis-card__panel">
          <h4>重点发现</h4>
          <ul v-if="analysis?.keyFindings?.length">
            <li v-for="item in analysis.keyFindings" :key="item">
              {{ item }}
            </li>
          </ul>
          <p v-else>未返回。</p>
        </article>

        <article class="watch-ai-analysis-card__panel">
          <h4>诊断建议</h4>
          <ul v-if="analysis?.diagnosticSuggestions?.length">
            <li v-for="item in analysis.diagnosticSuggestions" :key="item">
              {{ item }}
            </li>
          </ul>
          <p v-else>未返回。</p>
        </article>

        <article class="watch-ai-analysis-card__panel">
          <h4>下一步动作</h4>
          <ul v-if="analysis?.recommendedActions?.length">
            <li v-for="item in analysis.recommendedActions" :key="item">
              {{ item }}
            </li>
          </ul>
          <p v-else>未返回。</p>
        </article>
      </div>

      <article
        v-if="analysis?.limitations"
        class="watch-ai-analysis-card__panel watch-ai-analysis-card__panel--muted"
      >
        <h4>局限性</h4>
        <p>{{ analysis.limitations }}</p>
      </article>

      <article
        v-if="rawText"
        class="watch-ai-analysis-card__panel watch-ai-analysis-card__panel--mono"
      >
        <h4>原始返回</h4>
        <pre>{{ rawText }}</pre>
      </article>
    </div>

    <div v-else class="watch-ai-analysis-card__empty">
      当前记录还没有执行 AI 分析。
    </div>

    <footer class="watch-ai-analysis-card__footer">
      {{
        advisory ||
        "仅供辅助分析，不替代医生诊断。开发态会自动经本地代理转发；生产环境若仍跨域，请补后端或反向代理。"
      }}
    </footer>
  </section>
</template>

<style scoped lang="scss">
.watch-ai-analysis-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
  padding: 18px;
  border: 1px solid rgba(53, 98, 236, 0.16);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at right top,
      rgba(53, 98, 236, 0.08),
      transparent 28%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(245, 248, 255, 0.96) 100%
    );
}

.watch-ai-analysis-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.watch-ai-analysis-card__eyebrow {
  margin-bottom: 6px;
  color: rgba(53, 98, 236, 0.88);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.watch-ai-analysis-card__title {
  margin: 0;
  font-size: 22px;
}

.watch-ai-analysis-card__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.6);
  font-size: 13px;
  line-height: 1.55;
}

.watch-ai-analysis-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 128px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(53, 98, 236, 0.2);
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, #3562ec 0%, #5b82ff 100%);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.watch-ai-analysis-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
}

.watch-ai-analysis-card__error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
}

.watch-ai-analysis-card__empty {
  padding: 18px;
  border-radius: 18px;
  color: rgba(15, 23, 42, 0.56);
  background: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}

.watch-ai-analysis-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.watch-ai-analysis-card__summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.watch-ai-analysis-card__risk {
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.92);
  font-size: 12px;
  font-weight: 700;
}

.watch-ai-analysis-card__risk--moderate {
  color: #b45309;
  background: rgba(254, 243, 199, 0.92);
}

.watch-ai-analysis-card__risk--high {
  color: #b42318;
  background: rgba(254, 226, 226, 0.92);
}

.watch-ai-analysis-card__risk--unknown {
  color: #475467;
  background: rgba(241, 245, 249, 0.92);
}

.watch-ai-analysis-card__summary-text {
  margin: 0;
  color: rgba(15, 23, 42, 0.88);
  font-size: 14px;
  line-height: 1.65;
}

.watch-ai-analysis-card__provider {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: rgba(15, 23, 42, 0.54);
  font-size: 12px;
}

.watch-ai-analysis-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.watch-ai-analysis-card__panel {
  padding: 16px 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.84);

  h4 {
    margin: 0 0 10px;
    color: rgba(15, 23, 42, 0.88);
    font-size: 14px;
  }

  p {
    margin: 0;
    color: rgba(15, 23, 42, 0.68);
    font-size: 13px;
    line-height: 1.65;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    color: rgba(15, 23, 42, 0.68);
    font-size: 13px;
    line-height: 1.65;
  }
}

.watch-ai-analysis-card__panel--muted {
  background: rgba(248, 250, 252, 0.92);
}

.watch-ai-analysis-card__panel--mono {
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(15, 23, 42, 0.7);
    font-size: 12px;
    line-height: 1.6;
  }
}

.watch-ai-analysis-card__footer {
  padding: 14px 16px;
  border-radius: 18px;
  color: rgba(15, 23, 42, 0.62);
  background: rgba(255, 255, 255, 0.76);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .watch-ai-analysis-card__header {
    flex-direction: column;
  }

  .watch-ai-analysis-card__action {
    width: 100%;
  }

  .watch-ai-analysis-card__grid {
    grid-template-columns: 1fr;
  }
}
</style>
