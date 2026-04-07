const SPECIAL_SITE_LABELS = Object.freeze({
  top: "头顶部",
  "frontal-part": "额部",
  occipital: "枕部",
  mouth: "口部",
  nose: "鼻部",
  intestines: "肠区",
  stomach: "胃区",
  abdomen: "腹部",
  "pelvic-cavity": "盆腔区",
  perineum: "会阴部",
  "front-neck-center": "颈前正中",
  "nape-neck-center": "颈后正中",
  "thoracic-spine": "胸椎区",
  "lumbar-vertebra": "腰椎区",
  "sacrococcygeal-region": "骶尾区",
  "dorsal-part-of-left-hand": "左手背",
  "dorsal-right-hand": "右手背",
  "regiones-subscapularis-left": "左肩胛下区",
  "regiones-subscapularis-right": "右肩胛下区",
  "upper-quadrant-right": "右上腹",
  "thorax-left": "左侧胸廓",
  "thorax-right": "右侧胸廓",
  "left-quadrant": "左腹象限",
  "right-quadrant": "右腹象限",
  "left-upper-quadrant": "左上腹",
  "right-upper-quadrant": "右上腹",
  "left-lower-quadrant": "左下腹",
  "right-lower-quadrant": "右下腹",
});

const TOKEN_LABELS = Object.freeze({
  left: "左",
  right: "右",
  front: "前",
  dorsal: "背侧",
  temporal: "颞",
  ear: "耳部",
  eye: "眼部",
  cheek: "面颊",
  neck: "颈部",
  clavicular: "锁骨",
  region: "区",
  shoulder: "肩部",
  upper: "上",
  lower: "下",
  arm: "臂",
  elbow: "肘部",
  forearm: "前臂",
  wrist: "腕部",
  palm: "手掌",
  thumb: "拇指",
  index: "食指",
  middle: "中指",
  ring: "无名指",
  little: "小指",
  thorax: "胸廓",
  quadrant: "腹象限",
  groin: "腹股沟",
  area: "区",
  hip: "髋部",
  thigh: "大腿",
  popliteal: "腘窝",
  space: "",
  knee: "膝部",
  leg: "小腿",
  ankle: "踝部",
  foot: "足部",
  loin: "腰部",
  buttock: "臀部",
  scapula: "肩胛区",
  armpit: "腋窝",
});

const BODY_VIEW_OPTIONS = Object.freeze([
  { value: "front", label: "正面", shortLabel: "Front" },
  { value: "back", label: "背面", shortLabel: "Back" },
  { value: "left", label: "左侧", shortLabel: "Left" },
  { value: "right", label: "右侧", shortLabel: "Right" },
]);

export const BODY_TAG_OPTIONS = Object.freeze([
  {
    value: "pain",
    label: "疼痛",
    fill: "rgba(216, 61, 59, 0.32)",
    stroke: "#d83d3b",
  },
  {
    value: "numbness",
    label: "麻木",
    fill: "rgba(34, 114, 229, 0.26)",
    stroke: "#2272e5",
  },
  {
    value: "swelling",
    label: "肿胀",
    fill: "rgba(244, 126, 53, 0.28)",
    stroke: "#f47e35",
  },
  {
    value: "skin-change",
    label: "皮肤异常",
    fill: "rgba(130, 179, 38, 0.26)",
    stroke: "#82b326",
  },
  {
    value: "device-site",
    label: "设备/贴片",
    fill: "rgba(69, 148, 135, 0.26)",
    stroke: "#459487",
  },
  {
    value: "other",
    label: "其他",
    fill: "rgba(119, 130, 153, 0.28)",
    stroke: "#778299",
  },
]);

export const BODY_SYMPTOM_TEMPLATES = Object.freeze([
  {
    id: "localized-pain",
    label: "局部疼痛",
    description: "适合压痛、刀口痛、固定点位疼痛等局灶不适。",
    tags: ["pain"],
    severity: 3,
    note: "局部疼痛，",
  },
  {
    id: "radiating-pain",
    label: "放射痛",
    description: "适合从中心向肢体或邻近区域扩散的疼痛记录。",
    tags: ["pain"],
    severity: 4,
    note: "放射痛，建议补充起点、方向与诱因。",
  },
  {
    id: "numbness-area",
    label: "麻木区域",
    description: "适合麻木、针刺感、感觉减退等区域性主诉。",
    tags: ["numbness"],
    severity: 2,
    note: "麻木感，",
  },
  {
    id: "swelling-observation",
    label: "肿胀观察",
    description: "适合术后肿胀、压痕、水肿或局部肿大标记。",
    tags: ["swelling"],
    severity: 3,
    note: "局部肿胀，",
  },
  {
    id: "skin-abnormality",
    label: "皮肤异常",
    description: "适合红斑、破溃、皮疹、渗出等体表异常记录。",
    tags: ["skin-change"],
    severity: 2,
    note: "皮肤异常，",
  },
  {
    id: "device-placement",
    label: "设备贴附点",
    description: "适合贴片、导联、传感器、固定装置等位置标记。",
    tags: ["device-site"],
    severity: 1,
    note: "设备/贴片位点，",
  },
]);

export const BODY_SELECTION_MODE_OPTIONS = Object.freeze([
  { value: "multiple", label: "多部位" },
  { value: "single", label: "单部位" },
]);

const uniqueJoin = (parts) =>
  parts.filter(Boolean).reduce((labels, part) => {
    if (!labels.includes(part)) {
      labels.push(part);
    }

    return labels;
  }, []);

const buildFallbackLabel = (siteCode) => {
  const tokens = String(siteCode || "")
    .split("-")
    .filter(Boolean);

  if (!tokens.length) {
    return "未命名部位";
  }

  const resolvedTokens = tokens.map((token) => TOKEN_LABELS[token] || token);
  return uniqueJoin(resolvedTokens).join("");
};

export const resolveBodySiteLabel = (siteCode) => {
  const normalizedCode = String(siteCode || "").trim();

  if (!normalizedCode) {
    return "未命名部位";
  }

  return SPECIAL_SITE_LABELS[normalizedCode] || buildFallbackLabel(normalizedCode);
};

export const resolveBodySiteLabels = (siteCodes) =>
  (Array.isArray(siteCodes) ? siteCodes : [])
    .map((siteCode) => ({
      siteCode,
      label: resolveBodySiteLabel(siteCode),
    }))
    .filter((item) => item.siteCode);

export const getBodyTagMeta = (tagValue) =>
  BODY_TAG_OPTIONS.find((item) => item.value === tagValue) || BODY_TAG_OPTIONS[0];

export const getSymptomTemplateMeta = (templateId) =>
  BODY_SYMPTOM_TEMPLATES.find((item) => item.id === templateId) ||
  BODY_SYMPTOM_TEMPLATES[0];

export { BODY_VIEW_OPTIONS };
