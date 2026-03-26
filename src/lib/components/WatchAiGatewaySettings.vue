<script setup>
defineOptions({
  name: "WatchAiGatewaySettings",
});

const props = defineProps({
  config: {
    type: Object,
    default: () => ({}),
  },
  effectiveConfig: {
    type: Object,
    default: () => ({}),
  },
  presets: {
    type: Array,
    default: () => [],
  },
  hasSavedConfig: {
    type: Boolean,
    default: false,
  },
  isConfigured: {
    type: Boolean,
    default: false,
  },
  configSourceLabel: {
    type: String,
    default: "环境变量",
  },
  errorMessage: {
    type: String,
    default: "",
  },
  statusMessage: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["apply-preset", "update:config", "save", "reset"]);

function updateField(field, value) {
  emit("update:config", {
    ...props.config,
    [field]: value,
  });
}
</script>

<template>
  <section class="watch-ai-gateway-settings">
    <header class="watch-ai-gateway-settings__header">
      <div>
        <div class="watch-ai-gateway-settings__eyebrow">Gateway Config</div>
        <h3 class="watch-ai-gateway-settings__title">AI 网关配置</h3>
        <p class="watch-ai-gateway-settings__subtitle">
          直接在页面里填写第三方大模型网关参数，配置会保存在当前浏览器本地。
        </p>
      </div>

      <div class="watch-ai-gateway-settings__status">
        <span
          class="watch-ai-gateway-settings__badge"
          :class="{
            'watch-ai-gateway-settings__badge--active': isConfigured,
          }"
        >
          {{ isConfigured ? "已配置" : "未配置" }}
        </span>
        <span class="watch-ai-gateway-settings__source">
          当前来源：{{ configSourceLabel }}
        </span>
      </div>
    </header>

    <div class="watch-ai-gateway-settings__grid">
      <label class="watch-ai-gateway-settings__field">
        <span>Base URL</span>
        <input
          :value="config.baseUrl || ''"
          type="text"
          placeholder="https://your-gateway.example.com/v1"
          @input="updateField('baseUrl', $event.target.value)"
        />
      </label>

      <label class="watch-ai-gateway-settings__field">
        <span>Model</span>
        <input
          :value="config.model || ''"
          type="text"
          placeholder="gpt-4.1-mini"
          @input="updateField('model', $event.target.value)"
        />
      </label>

      <label
        class="watch-ai-gateway-settings__field watch-ai-gateway-settings__field--wide"
      >
        <span>API Key</span>
        <input
          :value="config.apiKey || ''"
          type="password"
          placeholder="sk-..."
          @input="updateField('apiKey', $event.target.value)"
        />
      </label>

      <label class="watch-ai-gateway-settings__field">
        <span>Provider Label</span>
        <input
          :value="config.provider || ''"
          type="text"
          placeholder="openai-compatible"
          @input="updateField('provider', $event.target.value)"
        />
      </label>

      <label class="watch-ai-gateway-settings__field">
        <span>Wire API</span>
        <select
          :value="config.wireApi || 'chat_completions'"
          @change="updateField('wireApi', $event.target.value)"
        >
          <option value="chat_completions">chat_completions</option>
          <option value="responses">responses</option>
        </select>
      </label>

      <label class="watch-ai-gateway-settings__field">
        <span>Path</span>
        <input
          :value="config.path || ''"
          type="text"
          placeholder="/chat/completions 或 /responses"
          @input="updateField('path', $event.target.value)"
        />
      </label>
    </div>

    <div v-if="presets.length" class="watch-ai-gateway-settings__presets">
      <span class="watch-ai-gateway-settings__presets-label">快速预设</span>

      <div class="watch-ai-gateway-settings__preset-list">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="watch-ai-gateway-settings__preset"
          @click="emit('apply-preset', preset.id)"
        >
          <strong>{{ preset.label }}</strong>
          <span>{{ preset.description }}</span>
        </button>
      </div>
    </div>

    <details class="watch-ai-gateway-settings__advanced">
      <summary>高级设置</summary>

      <div class="watch-ai-gateway-settings__grid">
        <label class="watch-ai-gateway-settings__field">
          <span>Header Name</span>
          <input
            :value="config.headerName || ''"
            type="text"
            placeholder="Authorization"
            @input="updateField('headerName', $event.target.value)"
          />
        </label>

        <label class="watch-ai-gateway-settings__field">
          <span>Header Prefix</span>
          <input
            :value="config.headerPrefix || ''"
            type="text"
            placeholder="Bearer "
            @input="updateField('headerPrefix', $event.target.value)"
          />
        </label>

        <label class="watch-ai-gateway-settings__field">
          <span>Temperature</span>
          <input
            :value="config.temperature ?? 0.2"
            type="number"
            min="0"
            max="2"
            step="0.1"
            @input="updateField('temperature', $event.target.value)"
          />
        </label>
      </div>
    </details>

    <div class="watch-ai-gateway-settings__meta">
      <span>当前 Provider：{{ effectiveConfig.provider || "--" }}</span>
      <span>当前 Model：{{ effectiveConfig.model || "--" }}</span>
      <span>当前 Wire API：{{ effectiveConfig.wireApi || "--" }}</span>
      <span>当前 Path：{{ effectiveConfig.path || "--" }}</span>
    </div>

    <p v-if="errorMessage" class="watch-ai-gateway-settings__error">
      {{ errorMessage }}
    </p>

    <p v-else-if="statusMessage" class="watch-ai-gateway-settings__success">
      {{ statusMessage }}
    </p>

    <footer class="watch-ai-gateway-settings__footer">
      <button
        type="button"
        class="watch-ai-gateway-settings__action watch-ai-gateway-settings__action--primary"
        @click="emit('save')"
      >
        保存页面配置
      </button>

      <button
        type="button"
        class="watch-ai-gateway-settings__action"
        :disabled="!hasSavedConfig"
        @click="emit('reset')"
      >
        恢复环境变量
      </button>
    </footer>

    <div class="watch-ai-gateway-settings__notice">
      开发态 `npm run dev` 会自动通过本地 `/ai-gateway`
      代理转发跨域请求。生产环境如果仍是跨域调用，依然需要后端或反向代理。
    </div>
  </section>
</template>

<style scoped lang="scss">
.watch-ai-gateway-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
  padding: 18px;
  border: 1px solid rgba(53, 98, 236, 0.14);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at left top,
      rgba(53, 98, 236, 0.08),
      transparent 26%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(245, 248, 255, 0.96) 100%
    );
}

.watch-ai-gateway-settings__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.watch-ai-gateway-settings__eyebrow {
  margin-bottom: 6px;
  color: rgba(53, 98, 236, 0.88);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.watch-ai-gateway-settings__title {
  margin: 0;
  font-size: 22px;
}

.watch-ai-gateway-settings__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.6);
  font-size: 13px;
  line-height: 1.55;
}

.watch-ai-gateway-settings__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.watch-ai-gateway-settings__badge {
  padding: 6px 10px;
  border-radius: 999px;
  color: #475467;
  background: rgba(241, 245, 249, 0.92);
  font-size: 12px;
  font-weight: 700;
}

.watch-ai-gateway-settings__badge--active {
  color: #177a4d;
  background: rgba(220, 252, 231, 0.92);
}

.watch-ai-gateway-settings__source {
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
}

.watch-ai-gateway-settings__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.watch-ai-gateway-settings__presets {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.watch-ai-gateway-settings__presets-label {
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
  font-weight: 600;
}

.watch-ai-gateway-settings__preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.watch-ai-gateway-settings__preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 220px;
  padding: 12px 14px;
  border: 1px solid rgba(53, 98, 236, 0.16);
  border-radius: 16px;
  color: rgba(15, 23, 42, 0.86);
  background: rgba(248, 250, 255, 0.92);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(53, 98, 236, 0.3);
    background: rgba(241, 246, 255, 0.96);
  }

  strong {
    font-size: 13px;
  }

  span {
    color: rgba(15, 23, 42, 0.58);
    font-size: 12px;
    line-height: 1.45;
  }
}

.watch-ai-gateway-settings__field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  span {
    color: rgba(15, 23, 42, 0.68);
    font-size: 12px;
    font-weight: 600;
  }

      input,
      select {
        height: 40px;
        padding: 0 12px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 14px;
        color: rgba(15, 23, 42, 0.88);
    background: rgba(255, 255, 255, 0.92);
  }
}

.watch-ai-gateway-settings__field--wide {
  grid-column: 1 / -1;
}

.watch-ai-gateway-settings__advanced {
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);

  summary {
    cursor: pointer;
    color: rgba(15, 23, 42, 0.74);
    font-size: 13px;
    font-weight: 700;
  }
}

.watch-ai-gateway-settings__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
}

.watch-ai-gateway-settings__error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
}

.watch-ai-gateway-settings__success {
  margin: 0;
  color: #177a4d;
  font-size: 12px;
}

.watch-ai-gateway-settings__footer {
  display: flex;
  gap: 10px;
}

.watch-ai-gateway-settings__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: rgba(15, 23, 42, 0.82);
  background: rgba(255, 255, 255, 0.88);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.watch-ai-gateway-settings__action--primary {
  color: #ffffff;
  border-color: rgba(53, 98, 236, 0.2);
  background: linear-gradient(135deg, #3562ec 0%, #5b82ff 100%);
}

.watch-ai-gateway-settings__notice {
  padding: 12px 14px;
  border-radius: 16px;
  color: rgba(15, 23, 42, 0.6);
  background: rgba(255, 255, 255, 0.76);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .watch-ai-gateway-settings__header {
    flex-direction: column;
  }

  .watch-ai-gateway-settings__status {
    align-items: flex-start;
  }

  .watch-ai-gateway-settings__grid {
    grid-template-columns: 1fr;
  }

  .watch-ai-gateway-settings__field--wide {
    grid-column: auto;
  }

  .watch-ai-gateway-settings__footer {
    flex-direction: column;
  }
}
</style>
