<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="waveform-context-menu"
      :style="menuStyle"
      @contextmenu.prevent
      @click.stop
    >
      <!-- 右键菜单只负责展示和抛出选择事件，真正的状态更新统一交给页面容器处理 -->
      <button
        v-for="item in WAVEFORM_CONTEXT_MENU_ITEMS"
        :key="item.key"
        type="button"
        class="waveform-context-menu__item"
        :class="{
          'waveform-context-menu__item--active':
            item.type === 'mode' && activeMode === item.key,
        }"
        @click="handleItemClick(item)"
      >
        <span class="waveform-context-menu__label">{{ item.label }}</span>
        <el-icon
          v-if="item.type === 'toggle' && checkedState[item.stateKey]"
          class="waveform-context-menu__icon"
        >
          <Check />
        </el-icon>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { Check } from "@element-plus/icons-vue";
import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { WAVEFORM_CONTEXT_MENU_ITEMS } from "../utils/waveformContextMenu";

defineOptions({
  name: "WaveformContextMenu",
});

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  viewportX: {
    type: Number,
    default: 0,
  },
  viewportY: {
    type: Number,
    default: 0,
  },
  checkedState: {
    type: Object,
    default: () => ({}),
  },
  activeMode: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "toggle", "select"]);

const menuRef = useTemplateRef("menuRef");
const menuPosition = ref({
  left: 0,
  top: 0,
});

const menuStyle = computed(() => ({
  left: `${menuPosition.value.left}px`,
  top: `${menuPosition.value.top}px`,
}));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function syncMenuPosition() {
  await nextTick();

  const menuElement = menuRef.value;
  if (!menuElement) return;

  const safePadding = 12;
  const menuWidth = menuElement.offsetWidth || 0;
  const menuHeight = menuElement.offsetHeight || 0;
  // 右键菜单始终贴近鼠标，但需要在视口边缘做裁剪，避免弹层超出屏幕。
  const maxLeft = Math.max(
    safePadding,
    window.innerWidth - menuWidth - safePadding,
  );
  const maxTop = Math.max(
    safePadding,
    window.innerHeight - menuHeight - safePadding,
  );
  // 这里严格只接受视口坐标。若上游字段传错，先兜底到安全边距，
  // 避免菜单再次因为 undefined/NaN 被吸到左上角。
  const viewportX = Number.isFinite(props.viewportX)
    ? props.viewportX
    : safePadding;
  const viewportY = Number.isFinite(props.viewportY)
    ? props.viewportY
    : safePadding;

  menuPosition.value = {
    left: clamp(viewportX, safePadding, maxLeft),
    top: clamp(viewportY, safePadding, maxTop),
  };
}

function handleClose() {
  emit("close");
}

function handleDocumentPointerDown(event) {
  if (menuRef.value?.contains(event.target)) {
    return;
  }

  handleClose();
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    handleClose();
  }
}

function bindDocumentListeners() {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", handleClose);
  window.addEventListener("blur", handleClose);
}

function unbindDocumentListeners() {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", handleClose);
  window.removeEventListener("blur", handleClose);
}

function handleItemClick(item) {
  if (item.type === "toggle") {
    emit("toggle", item.key);
    return;
  }

  emit("select", item.key);
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      bindDocumentListeners();
      await syncMenuPosition();
      return;
    }

    unbindDocumentListeners();
  },
  { immediate: true },
);

watch(
  () => [props.visible, props.viewportX, props.viewportY],
  ([visible]) => {
    if (!visible) return;
    syncMenuPosition();
  },
);

onUnmounted(() => {
  unbindDocumentListeners();
});
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.waveform-context-menu {
  position: fixed;
  z-index: 2100;
  min-width: 260px;
  padding: $spacing-sm 0;
  background: $gray-white;
  border: 1px solid rgba(53, 98, 236, 0.12);
  border-radius: $radius-xl;
  box-shadow: 0 18px 36px rgba(17, 24, 39, 0.12);
}

.waveform-context-menu__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  padding: 10px $spacing-lg;
  color: $text-primary;
  font: $font-body-lg;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(53, 98, 236, 0.06);
  }

  &--active {
    background: rgba(53, 98, 236, 0.08);
    color: $brand-7-normal;
  }
}

.waveform-context-menu__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.waveform-context-menu__icon {
  flex-shrink: 0;
  color: $brand-7-normal;
  font-size: 16px;
}
</style>
