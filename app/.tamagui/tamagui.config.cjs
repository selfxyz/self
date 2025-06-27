var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tamagui.config.ts
var tamagui_config_exports = {};
__export(tamagui_config_exports, {
  default: () => tamagui_config_default
});
module.exports = __toCommonJS(tamagui_config_exports);

// ../node_modules/@tamagui/shorthands/dist/esm/v2.mjs
var shorthands = {
  // web-only
  ussel: "userSelect",
  cur: "cursor",
  // tamagui
  pe: "pointerEvents",
  // text
  col: "color",
  ff: "fontFamily",
  fos: "fontSize",
  fost: "fontStyle",
  fow: "fontWeight",
  ls: "letterSpacing",
  lh: "lineHeight",
  ta: "textAlign",
  tt: "textTransform",
  ww: "wordWrap",
  // view
  ac: "alignContent",
  ai: "alignItems",
  als: "alignSelf",
  b: "bottom",
  bg: "backgroundColor",
  bbc: "borderBottomColor",
  bblr: "borderBottomLeftRadius",
  bbrr: "borderBottomRightRadius",
  bbw: "borderBottomWidth",
  blc: "borderLeftColor",
  blw: "borderLeftWidth",
  bc: "borderColor",
  br: "borderRadius",
  bs: "borderStyle",
  brw: "borderRightWidth",
  brc: "borderRightColor",
  btc: "borderTopColor",
  btlr: "borderTopLeftRadius",
  btrr: "borderTopRightRadius",
  btw: "borderTopWidth",
  bw: "borderWidth",
  dsp: "display",
  f: "flex",
  fb: "flexBasis",
  fd: "flexDirection",
  fg: "flexGrow",
  fs: "flexShrink",
  fw: "flexWrap",
  h: "height",
  jc: "justifyContent",
  l: "left",
  m: "margin",
  mah: "maxHeight",
  maw: "maxWidth",
  mb: "marginBottom",
  mih: "minHeight",
  miw: "minWidth",
  ml: "marginLeft",
  mr: "marginRight",
  mt: "marginTop",
  mx: "marginHorizontal",
  my: "marginVertical",
  o: "opacity",
  ov: "overflow",
  p: "padding",
  pb: "paddingBottom",
  pl: "paddingLeft",
  pos: "position",
  pr: "paddingRight",
  pt: "paddingTop",
  px: "paddingHorizontal",
  py: "paddingVertical",
  r: "right",
  shac: "shadowColor",
  shar: "shadowRadius",
  shof: "shadowOffset",
  shop: "shadowOpacity",
  t: "top",
  w: "width",
  zi: "zIndex"
};
shorthands.bls = "borderLeftStyle";
shorthands.brs = "borderRightStyle";
shorthands.bts = "borderTopStyle";
shorthands.bbs = "borderBottomStyle";
shorthands.bxs = "boxSizing";
shorthands.bxsh = "boxShadow";
shorthands.ox = "overflowX";
shorthands.oy = "overflowY";

// ../node_modules/@tamagui/colors/dist/esm/dark/blue.mjs
var blue = {
  blue1: "hsl(212, 35.0%, 9.2%)",
  blue2: "hsl(216, 50.0%, 11.8%)",
  blue3: "hsl(214, 59.4%, 15.3%)",
  blue4: "hsl(214, 65.8%, 17.9%)",
  blue5: "hsl(213, 71.2%, 20.2%)",
  blue6: "hsl(212, 77.4%, 23.1%)",
  blue7: "hsl(211, 85.1%, 27.4%)",
  blue8: "hsl(211, 89.7%, 34.1%)",
  blue9: "hsl(206, 100%, 50.0%)",
  blue10: "hsl(209, 100%, 60.6%)",
  blue11: "hsl(210, 100%, 66.1%)",
  blue12: "hsl(206, 98.0%, 95.8%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/gray.mjs
var gray = {
  gray1: "hsl(0, 0%, 8.5%)",
  gray2: "hsl(0, 0%, 11.0%)",
  gray3: "hsl(0, 0%, 13.6%)",
  gray4: "hsl(0, 0%, 15.8%)",
  gray5: "hsl(0, 0%, 17.9%)",
  gray6: "hsl(0, 0%, 20.5%)",
  gray7: "hsl(0, 0%, 24.3%)",
  gray8: "hsl(0, 0%, 31.2%)",
  gray9: "hsl(0, 0%, 43.9%)",
  gray10: "hsl(0, 0%, 49.4%)",
  gray11: "hsl(0, 0%, 62.8%)",
  gray12: "hsl(0, 0%, 93.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/green.mjs
var green = {
  green1: "hsl(146, 30.0%, 7.4%)",
  green2: "hsl(155, 44.2%, 8.4%)",
  green3: "hsl(155, 46.7%, 10.9%)",
  green4: "hsl(154, 48.4%, 12.9%)",
  green5: "hsl(154, 49.7%, 14.9%)",
  green6: "hsl(154, 50.9%, 17.6%)",
  green7: "hsl(153, 51.8%, 21.8%)",
  green8: "hsl(151, 51.7%, 28.4%)",
  green9: "hsl(151, 55.0%, 41.5%)",
  green10: "hsl(151, 49.3%, 46.5%)",
  green11: "hsl(151, 50.0%, 53.2%)",
  green12: "hsl(137, 72.0%, 94.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/orange.mjs
var orange = {
  orange1: "hsl(30, 70.0%, 7.2%)",
  orange2: "hsl(28, 100%, 8.4%)",
  orange3: "hsl(26, 91.1%, 11.6%)",
  orange4: "hsl(25, 88.3%, 14.1%)",
  orange5: "hsl(24, 87.6%, 16.6%)",
  orange6: "hsl(24, 88.6%, 19.8%)",
  orange7: "hsl(24, 92.4%, 24.0%)",
  orange8: "hsl(25, 100%, 29.0%)",
  orange9: "hsl(24, 94.0%, 50.0%)",
  orange10: "hsl(24, 100%, 58.5%)",
  orange11: "hsl(24, 100%, 62.2%)",
  orange12: "hsl(24, 97.0%, 93.2%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/pink.mjs
var pink = {
  pink1: "hsl(318, 25.0%, 9.6%)",
  pink2: "hsl(319, 32.2%, 11.6%)",
  pink3: "hsl(319, 41.0%, 16.0%)",
  pink4: "hsl(320, 45.4%, 18.7%)",
  pink5: "hsl(320, 49.0%, 21.1%)",
  pink6: "hsl(321, 53.6%, 24.4%)",
  pink7: "hsl(321, 61.1%, 29.7%)",
  pink8: "hsl(322, 74.9%, 37.5%)",
  pink9: "hsl(322, 65.0%, 54.5%)",
  pink10: "hsl(323, 72.8%, 59.2%)",
  pink11: "hsl(325, 90.0%, 66.4%)",
  pink12: "hsl(322, 90.0%, 95.8%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/purple.mjs
var purple = {
  purple1: "hsl(284, 20.0%, 9.6%)",
  purple2: "hsl(283, 30.0%, 11.8%)",
  purple3: "hsl(281, 37.5%, 16.5%)",
  purple4: "hsl(280, 41.2%, 20.0%)",
  purple5: "hsl(279, 43.8%, 23.3%)",
  purple6: "hsl(277, 46.4%, 27.5%)",
  purple7: "hsl(275, 49.3%, 34.6%)",
  purple8: "hsl(272, 52.1%, 45.9%)",
  purple9: "hsl(272, 51.0%, 54.0%)",
  purple10: "hsl(273, 57.3%, 59.1%)",
  purple11: "hsl(275, 80.0%, 71.0%)",
  purple12: "hsl(279, 75.0%, 95.7%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/red.mjs
var red = {
  red1: "hsl(353, 23.0%, 9.8%)",
  red2: "hsl(357, 34.4%, 12.0%)",
  red3: "hsl(356, 43.4%, 16.4%)",
  red4: "hsl(356, 47.6%, 19.2%)",
  red5: "hsl(356, 51.1%, 21.9%)",
  red6: "hsl(356, 55.2%, 25.9%)",
  red7: "hsl(357, 60.2%, 31.8%)",
  red8: "hsl(358, 65.0%, 40.4%)",
  red9: "hsl(358, 75.0%, 59.0%)",
  red10: "hsl(358, 85.3%, 64.0%)",
  red11: "hsl(358, 100%, 69.5%)",
  red12: "hsl(351, 89.0%, 96.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/dark/yellow.mjs
var yellow = {
  yellow1: "hsl(45, 100%, 5.5%)",
  yellow2: "hsl(46, 100%, 6.7%)",
  yellow3: "hsl(45, 100%, 8.7%)",
  yellow4: "hsl(45, 100%, 10.4%)",
  yellow5: "hsl(47, 100%, 12.1%)",
  yellow6: "hsl(49, 100%, 14.3%)",
  yellow7: "hsl(49, 90.3%, 18.4%)",
  yellow8: "hsl(50, 100%, 22.0%)",
  yellow9: "hsl(53, 92.0%, 50.0%)",
  yellow10: "hsl(54, 100%, 68.0%)",
  yellow11: "hsl(48, 100%, 47.0%)",
  yellow12: "hsl(53, 100%, 91.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/blue.mjs
var blue2 = {
  blue1: "hsl(206, 100%, 99.2%)",
  blue2: "hsl(210, 100%, 98.0%)",
  blue3: "hsl(209, 100%, 96.5%)",
  blue4: "hsl(210, 98.8%, 94.0%)",
  blue5: "hsl(209, 95.0%, 90.1%)",
  blue6: "hsl(209, 81.2%, 84.5%)",
  blue7: "hsl(208, 77.5%, 76.9%)",
  blue8: "hsl(206, 81.9%, 65.3%)",
  blue9: "hsl(206, 100%, 50.0%)",
  blue10: "hsl(208, 100%, 47.3%)",
  blue11: "hsl(211, 100%, 43.2%)",
  blue12: "hsl(211, 100%, 15.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/gray.mjs
var gray2 = {
  gray1: "hsl(0, 0%, 99.0%)",
  gray2: "hsl(0, 0%, 97.3%)",
  gray3: "hsl(0, 0%, 95.1%)",
  gray4: "hsl(0, 0%, 93.0%)",
  gray5: "hsl(0, 0%, 90.9%)",
  gray6: "hsl(0, 0%, 88.7%)",
  gray7: "hsl(0, 0%, 85.8%)",
  gray8: "hsl(0, 0%, 78.0%)",
  gray9: "hsl(0, 0%, 56.1%)",
  gray10: "hsl(0, 0%, 52.3%)",
  gray11: "hsl(0, 0%, 43.5%)",
  gray12: "hsl(0, 0%, 9.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/green.mjs
var green2 = {
  green1: "hsl(136, 50.0%, 98.9%)",
  green2: "hsl(138, 62.5%, 96.9%)",
  green3: "hsl(139, 55.2%, 94.5%)",
  green4: "hsl(140, 48.7%, 91.0%)",
  green5: "hsl(141, 43.7%, 86.0%)",
  green6: "hsl(143, 40.3%, 79.0%)",
  green7: "hsl(146, 38.5%, 69.0%)",
  green8: "hsl(151, 40.2%, 54.1%)",
  green9: "hsl(151, 55.0%, 41.5%)",
  green10: "hsl(152, 57.5%, 37.6%)",
  green11: "hsl(153, 67.0%, 28.5%)",
  green12: "hsl(155, 40.0%, 14.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/orange.mjs
var orange2 = {
  orange1: "hsl(24, 70.0%, 99.0%)",
  orange2: "hsl(24, 83.3%, 97.6%)",
  orange3: "hsl(24, 100%, 95.3%)",
  orange4: "hsl(25, 100%, 92.2%)",
  orange5: "hsl(25, 100%, 88.2%)",
  orange6: "hsl(25, 100%, 82.8%)",
  orange7: "hsl(24, 100%, 75.3%)",
  orange8: "hsl(24, 94.5%, 64.3%)",
  orange9: "hsl(24, 94.0%, 50.0%)",
  orange10: "hsl(24, 100%, 46.5%)",
  orange11: "hsl(24, 100%, 37.0%)",
  orange12: "hsl(15, 60.0%, 17.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/pink.mjs
var pink2 = {
  pink1: "hsl(322, 100%, 99.4%)",
  pink2: "hsl(323, 100%, 98.4%)",
  pink3: "hsl(323, 86.3%, 96.5%)",
  pink4: "hsl(323, 78.7%, 94.2%)",
  pink5: "hsl(323, 72.2%, 91.1%)",
  pink6: "hsl(323, 66.3%, 86.6%)",
  pink7: "hsl(323, 62.0%, 80.1%)",
  pink8: "hsl(323, 60.3%, 72.4%)",
  pink9: "hsl(322, 65.0%, 54.5%)",
  pink10: "hsl(322, 63.9%, 50.7%)",
  pink11: "hsl(322, 75.0%, 46.0%)",
  pink12: "hsl(320, 70.0%, 13.5%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/purple.mjs
var purple2 = {
  purple1: "hsl(280, 65.0%, 99.4%)",
  purple2: "hsl(276, 100%, 99.0%)",
  purple3: "hsl(276, 83.1%, 97.0%)",
  purple4: "hsl(275, 76.4%, 94.7%)",
  purple5: "hsl(275, 70.8%, 91.8%)",
  purple6: "hsl(274, 65.4%, 87.8%)",
  purple7: "hsl(273, 61.0%, 81.7%)",
  purple8: "hsl(272, 60.0%, 73.5%)",
  purple9: "hsl(272, 51.0%, 54.0%)",
  purple10: "hsl(272, 46.8%, 50.3%)",
  purple11: "hsl(272, 50.0%, 45.8%)",
  purple12: "hsl(272, 66.0%, 16.0%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/red.mjs
var red2 = {
  red1: "hsl(359, 100%, 99.4%)",
  red2: "hsl(359, 100%, 98.6%)",
  red3: "hsl(360, 100%, 96.8%)",
  red4: "hsl(360, 97.9%, 94.8%)",
  red5: "hsl(360, 90.2%, 91.9%)",
  red6: "hsl(360, 81.7%, 87.8%)",
  red7: "hsl(359, 74.2%, 81.7%)",
  red8: "hsl(359, 69.5%, 74.3%)",
  red9: "hsl(358, 75.0%, 59.0%)",
  red10: "hsl(358, 69.4%, 55.2%)",
  red11: "hsl(358, 65.0%, 48.7%)",
  red12: "hsl(354, 50.0%, 14.6%)"
};

// ../node_modules/@tamagui/colors/dist/esm/light/yellow.mjs
var yellow2 = {
  yellow1: "hsl(60, 54.0%, 98.5%)",
  yellow2: "hsl(52, 100%, 95.5%)",
  yellow3: "hsl(55, 100%, 90.9%)",
  yellow4: "hsl(54, 100%, 86.6%)",
  yellow5: "hsl(52, 97.9%, 82.0%)",
  yellow6: "hsl(50, 89.4%, 76.1%)",
  yellow7: "hsl(47, 80.4%, 68.0%)",
  yellow8: "hsl(48, 100%, 46.1%)",
  yellow9: "hsl(53, 92.0%, 50.0%)",
  yellow10: "hsl(50, 100%, 48.5%)",
  yellow11: "hsl(42, 100%, 29.0%)",
  yellow12: "hsl(40, 55.0%, 13.5%)"
};

// ../node_modules/@tamagui/create-theme/dist/esm/isMinusZero.mjs
function isMinusZero(value) {
  return 1 / value === Number.NEGATIVE_INFINITY;
}
__name(isMinusZero, "isMinusZero");

// ../node_modules/@tamagui/create-theme/dist/esm/themeInfo.mjs
var THEME_INFO = /* @__PURE__ */ new Map();
var getThemeInfo = /* @__PURE__ */ __name((theme, name) => THEME_INFO.get(name || JSON.stringify(theme)), "getThemeInfo");
var setThemeInfo = /* @__PURE__ */ __name((theme, info) => {
  const next = {
    ...info,
    cache: /* @__PURE__ */ new Map()
  };
  THEME_INFO.set(info.name || JSON.stringify(theme), next), THEME_INFO.set(JSON.stringify(info.definition), next);
}, "setThemeInfo");

// ../node_modules/@tamagui/create-theme/dist/esm/createTheme.mjs
var identityCache = /* @__PURE__ */ new Map();
function createThemeWithPalettes(palettes, defaultPalette, definition, options, name, skipCache = false) {
  if (!palettes[defaultPalette]) throw new Error(`No pallete: ${defaultPalette}`);
  const newDef = {
    ...definition
  };
  for (const key in definition) {
    let val = definition[key];
    if (typeof val == "string" && val[0] === "$") {
      const [altPaletteName$, altPaletteIndex] = val.split("."), altPaletteName = altPaletteName$.slice(1), parentName = defaultPalette.split("_")[0], altPalette = palettes[altPaletteName] || palettes[`${parentName}_${altPaletteName}`];
      if (altPalette) {
        const next = getValue(altPalette, +altPaletteIndex);
        typeof next < "u" && (newDef[key] = next);
      }
    }
  }
  return createTheme(palettes[defaultPalette], newDef, options, name, skipCache);
}
__name(createThemeWithPalettes, "createThemeWithPalettes");
function createTheme(palette, definition, options, name, skipCache = false) {
  const cacheKey = skipCache ? "" : JSON.stringify([name, palette, definition, options]);
  if (!skipCache && identityCache.has(cacheKey)) return identityCache.get(cacheKey);
  const theme = {
    ...Object.fromEntries(Object.entries(definition).map(([key, offset]) => [key, getValue(palette, offset)])),
    ...options?.nonInheritedValues
  };
  return setThemeInfo(theme, {
    palette,
    definition,
    options,
    name
  }), cacheKey && identityCache.set(cacheKey, theme), theme;
}
__name(createTheme, "createTheme");
var getValue = /* @__PURE__ */ __name((palette, value) => {
  if (!palette) throw new Error("No palette!");
  if (typeof value == "string") return value;
  const max = palette.length - 1, next = (value === 0 ? !isMinusZero(value) : value >= 0) ? value : max + value, index = Math.min(Math.max(0, next), max);
  return palette[index];
}, "getValue");

// ../node_modules/@tamagui/create-theme/dist/esm/helpers.mjs
function objectEntries(obj) {
  return Object.entries(obj);
}
__name(objectEntries, "objectEntries");
function objectFromEntries(arr) {
  return Object.fromEntries(arr);
}
__name(objectFromEntries, "objectFromEntries");

// ../node_modules/@tamagui/create-theme/dist/esm/masks.mjs
var createMask = /* @__PURE__ */ __name((createMask2) => typeof createMask2 == "function" ? {
  name: createMask2.name || "unnamed",
  mask: createMask2
} : createMask2, "createMask");
var skipMask = {
  name: "skip-mask",
  mask: /* @__PURE__ */ __name((template, opts) => {
    const {
      skip
    } = opts;
    return Object.fromEntries(Object.entries(template).filter(([k]) => !skip || !(k in skip)).map(([k, v]) => [k, applyOverrides(k, v, opts)]));
  }, "mask")
};
function applyOverrides(key, value, opts) {
  let override, strategy = opts.overrideStrategy;
  const overrideSwap = opts.overrideSwap?.[key];
  if (typeof overrideSwap < "u") override = overrideSwap, strategy = "swap";
  else {
    const overrideShift = opts.overrideShift?.[key];
    if (typeof overrideShift < "u") override = overrideShift, strategy = "shift";
    else {
      const overrideDefault = opts.override?.[key];
      typeof overrideDefault < "u" && (override = overrideDefault, strategy = opts.overrideStrategy);
    }
  }
  return typeof override > "u" || typeof override == "string" ? value : strategy === "swap" ? override : value;
}
__name(applyOverrides, "applyOverrides");
var createIdentityMask = /* @__PURE__ */ __name(() => ({
  name: "identity-mask",
  mask: /* @__PURE__ */ __name((template, opts) => skipMask.mask(template, opts), "mask")
}), "createIdentityMask");
var createInverseMask = /* @__PURE__ */ __name(() => ({
  name: "inverse-mask",
  mask: /* @__PURE__ */ __name((template, opts) => {
    const inversed = objectFromEntries(objectEntries(template).map(([k, v]) => [k, -v]));
    return skipMask.mask(inversed, opts);
  }, "mask")
}), "createInverseMask");
var createShiftMask = /* @__PURE__ */ __name(({
  inverse
} = {}, defaultOptions) => ({
  name: "shift-mask",
  mask: /* @__PURE__ */ __name((template, opts) => {
    const {
      override,
      overrideStrategy = "shift",
      max: maxIn,
      palette,
      min = 0,
      strength = 1
    } = {
      ...defaultOptions,
      ...opts
    }, values = Object.entries(template), max = maxIn ?? (palette ? Object.values(palette).length - 1 : Number.POSITIVE_INFINITY), out = {};
    for (const [key, value] of values) {
      if (typeof value == "string") continue;
      if (typeof override?.[key] == "number") {
        const overrideVal = override[key];
        out[key] = overrideStrategy === "shift" ? value + overrideVal : overrideVal;
        continue;
      }
      if (typeof override?.[key] == "string") {
        out[key] = override[key];
        continue;
      }
      const isPositive = value === 0 ? !isMinusZero(value) : value >= 0, direction = isPositive ? 1 : -1, invert = inverse ? -1 : 1, next = value + strength * direction * invert, clamped = isPositive ? Math.max(min, Math.min(max, next)) : Math.min(-min, Math.max(-max, next));
      out[key] = clamped;
    }
    return skipMask.mask(out, opts);
  }, "mask")
}), "createShiftMask");
var createWeakenMask = /* @__PURE__ */ __name((defaultOptions) => ({
  name: "soften-mask",
  mask: createShiftMask({}, defaultOptions).mask
}), "createWeakenMask");
var createSoftenMask = createWeakenMask;
var createStrengthenMask = /* @__PURE__ */ __name((defaultOptions) => ({
  name: "strengthen-mask",
  mask: createShiftMask({
    inverse: true
  }, defaultOptions).mask
}), "createStrengthenMask");

// ../node_modules/@tamagui/create-theme/dist/esm/applyMask.mjs
function applyMask(theme, mask, options = {}, parentName, nextName) {
  const info = getThemeInfo(theme, parentName);
  if (!info) throw new Error(process.env.NODE_ENV !== "production" ? "No info found for theme, you must pass the theme created by createThemeFromPalette directly to extendTheme" : "\u274C Err2");
  const next = applyMaskStateless(info, mask, options, parentName);
  return setThemeInfo(next.theme, {
    definition: next.definition,
    palette: info.palette,
    name: nextName
  }), next.theme;
}
__name(applyMask, "applyMask");
function applyMaskStateless(info, mask, options = {}, parentName) {
  const skip = {
    ...options.skip
  };
  if (info.options?.nonInheritedValues) for (const key in info.options.nonInheritedValues) skip[key] = 1;
  const maskOptions = {
    parentName,
    palette: info.palette,
    ...options,
    skip
  }, template = mask.mask(info.definition, maskOptions), theme = createTheme(info.palette, template);
  return {
    ...info,
    cache: /* @__PURE__ */ new Map(),
    definition: template,
    theme
  };
}
__name(applyMaskStateless, "applyMaskStateless");

// ../node_modules/@tamagui/create-theme/dist/esm/combineMasks.mjs
var combineMasks = /* @__PURE__ */ __name((...masks2) => ({
  name: "combine-mask",
  mask: /* @__PURE__ */ __name((template, opts) => {
    let current = getThemeInfo(template, opts.parentName), theme;
    for (const mask2 of masks2) {
      if (!current) throw new Error(`Nothing returned from mask: ${current}, for template: ${template} and mask: ${mask2.toString()}, given opts ${JSON.stringify(opts, null, 2)}`);
      const next = applyMaskStateless(current, mask2, opts);
      current = next, theme = next.theme;
    }
    return theme;
  }, "mask")
}), "combineMasks");

// ../node_modules/@tamagui/theme-builder/dist/esm/ThemeBuilder.mjs
var ThemeBuilder = class {
  static {
    __name(this, "ThemeBuilder");
  }
  constructor(state) {
    this.state = state;
  }
  addPalettes(palettes) {
    return this.state.palettes = {
      // as {} prevents generic string key merge messing up types
      ...this.state.palettes,
      ...palettes
    }, this;
  }
  addTemplates(templates) {
    return this.state.templates = {
      // as {} prevents generic string key merge messing up types
      ...this.state.templates,
      ...templates
    }, this;
  }
  addMasks(masks2) {
    return this.state.masks = {
      // as {} prevents generic string key merge messing up types
      ...this.state.masks,
      ...objectFromEntries(objectEntries(masks2).map(([key, val]) => [key, createMask(val)]))
    }, this;
  }
  // for dev mode only really
  _addedThemes = [];
  addThemes(themes3) {
    return this._addedThemes.push({
      type: "themes",
      args: [themes3]
    }), this.state.themes = {
      // as {} prevents generic string key merge messing up types
      ...this.state.themes,
      ...themes3
    }, this;
  }
  // these wont be typed to save some complexity and because they don't need to be typed!
  addComponentThemes(childThemeDefinition, options) {
    return this.addChildThemes(childThemeDefinition, options), this;
  }
  addChildThemes(childThemeDefinition, options) {
    const currentThemes = this.state.themes;
    if (!currentThemes) throw new Error("No themes defined yet, use addThemes first to set your base themes");
    this._addedThemes.push({
      type: "childThemes",
      args: [childThemeDefinition, options]
    });
    const currentThemeNames = Object.keys(currentThemes), incomingThemeNames = Object.keys(childThemeDefinition), namesWithDefinitions = currentThemeNames.flatMap((prefix) => {
      const avoidNestingWithin = options?.avoidNestingWithin;
      return avoidNestingWithin && avoidNestingWithin.some((avoidName) => prefix.startsWith(avoidName) || prefix.endsWith(avoidName)) ? [] : incomingThemeNames.map((subName) => {
        const fullName = `${prefix}_${subName}`, definition = childThemeDefinition[subName];
        return "avoidNestingWithin" in definition && definition.avoidNestingWithin.some((name) => prefix.startsWith(name) || prefix.endsWith(name)) ? null : [fullName, definition];
      }).filter(Boolean);
    }), childThemes = Object.fromEntries(namesWithDefinitions), next = {
      // as {} prevents generic string key merge messing up types
      ...this.state.themes,
      ...childThemes
    };
    return this.state.themes = next, this;
  }
  build() {
    if (!this.state.themes) return {};
    const out = {}, maskedThemes = [];
    for (const themeName in this.state.themes) {
      const nameParts = themeName.split("_"), parentName = nameParts.slice(0, nameParts.length - 1).join("_"), definitions = this.state.themes[themeName], themeDefinition = Array.isArray(definitions) ? (() => {
        const found = definitions.find(
          // endWith match stronger than startsWith
          (d) => d.parent ? parentName.endsWith(d.parent) || parentName.startsWith(d.parent) : true
        );
        return found || null;
      })() : definitions;
      if (themeDefinition) if ("theme" in themeDefinition) out[themeName] = themeDefinition.theme;
      else if ("mask" in themeDefinition) maskedThemes.push({
        parentName,
        themeName,
        mask: themeDefinition
      });
      else {
        let {
          palette: paletteName = "",
          template: templateName,
          ...options
        } = themeDefinition;
        const parentDefinition = this.state.themes[parentName];
        if (!this.state.palettes) throw new Error(`No palettes defined for theme with palette expected: ${themeName}`);
        let palette = this.state.palettes[paletteName || ""], attemptParentName = `${parentName}_${paletteName}`;
        for (; !palette && attemptParentName; ) attemptParentName in this.state.palettes ? (palette = this.state.palettes[attemptParentName], paletteName = attemptParentName) : attemptParentName = attemptParentName.split("_").slice(0, -1).join("_");
        if (!palette) {
          const msg = process.env.NODE_ENV !== "production" ? `: ${themeName}: ${paletteName}
          Definition: ${JSON.stringify(themeDefinition)}
          Parent: ${JSON.stringify(parentDefinition)}
          Potential: (${Object.keys(this.state.palettes).join(", ")})` : "";
          throw new Error(`No palette for theme${msg}`);
        }
        const template = this.state.templates?.[templateName] ?? // fall back to finding the scheme specific on if it exists
        this.state.templates?.[`${nameParts[0]}_${templateName}`];
        if (!template) throw new Error(`No template for theme ${themeName}: ${templateName} in templates:
- ${Object.keys(this.state.templates || {}).join(`
 - `)}`);
        out[themeName] = createThemeWithPalettes(this.state.palettes, paletteName, template, options, themeName, true);
      }
    }
    for (const {
      mask,
      themeName,
      parentName
    } of maskedThemes) {
      const parent = out[parentName];
      if (!parent) continue;
      const {
        mask: maskName,
        ...options
      } = mask;
      let maskFunction = this.state.masks?.[maskName];
      if (!maskFunction) throw new Error(`No mask ${maskName}`);
      const parentTheme = this.state.themes[parentName];
      if (parentTheme && "childOptions" in parentTheme) {
        const {
          mask: mask2,
          ...childOpts
        } = parentTheme.childOptions;
        mask2 && (maskFunction = this.state.masks?.[mask2]), Object.assign(options, childOpts);
      }
      out[themeName] = applyMask(parent, maskFunction, options, parentName, themeName);
    }
    return out;
  }
};
function createThemeBuilder() {
  return new ThemeBuilder({});
}
__name(createThemeBuilder, "createThemeBuilder");

// ../node_modules/color2k/dist/index.exports.import.es.mjs
function guard(low, high, value) {
  return Math.min(Math.max(low, value), high);
}
__name(guard, "guard");
var ColorError = class extends Error {
  static {
    __name(this, "ColorError");
  }
  constructor(color2) {
    super(`Failed to parse color: "${color2}"`);
  }
};
var ColorError$1 = ColorError;
function parseToRgba(color2) {
  if (typeof color2 !== "string") throw new ColorError$1(color2);
  if (color2.trim().toLowerCase() === "transparent") return [0, 0, 0, 0];
  let normalizedColor = color2.trim();
  normalizedColor = namedColorRegex.test(color2) ? nameToHex(color2) : color2;
  const reducedHexMatch = reducedHexRegex.exec(normalizedColor);
  if (reducedHexMatch) {
    const arr = Array.from(reducedHexMatch).slice(1);
    return [...arr.slice(0, 3).map((x) => parseInt(r(x, 2), 16)), parseInt(r(arr[3] || "f", 2), 16) / 255];
  }
  const hexMatch = hexRegex.exec(normalizedColor);
  if (hexMatch) {
    const arr = Array.from(hexMatch).slice(1);
    return [...arr.slice(0, 3).map((x) => parseInt(x, 16)), parseInt(arr[3] || "ff", 16) / 255];
  }
  const rgbaMatch = rgbaRegex.exec(normalizedColor);
  if (rgbaMatch) {
    const arr = Array.from(rgbaMatch).slice(1);
    return [...arr.slice(0, 3).map((x) => parseInt(x, 10)), parseFloat(arr[3] || "1")];
  }
  const hslaMatch = hslaRegex.exec(normalizedColor);
  if (hslaMatch) {
    const [h, s, l, a] = Array.from(hslaMatch).slice(1).map(parseFloat);
    if (guard(0, 100, s) !== s) throw new ColorError$1(color2);
    if (guard(0, 100, l) !== l) throw new ColorError$1(color2);
    return [...hslToRgb(h, s, l), Number.isNaN(a) ? 1 : a];
  }
  throw new ColorError$1(color2);
}
__name(parseToRgba, "parseToRgba");
function hash(str) {
  let hash2 = 5381;
  let i = str.length;
  while (i) {
    hash2 = hash2 * 33 ^ str.charCodeAt(--i);
  }
  return (hash2 >>> 0) % 2341;
}
__name(hash, "hash");
var colorToInt = /* @__PURE__ */ __name((x) => parseInt(x.replace(/_/g, ""), 36), "colorToInt");
var compressedColorMap = "1q29ehhb 1n09sgk7 1kl1ekf_ _yl4zsno 16z9eiv3 1p29lhp8 _bd9zg04 17u0____ _iw9zhe5 _to73___ _r45e31e _7l6g016 _jh8ouiv _zn3qba8 1jy4zshs 11u87k0u 1ro9yvyo 1aj3xael 1gz9zjz0 _3w8l4xo 1bf1ekf_ _ke3v___ _4rrkb__ 13j776yz _646mbhl _nrjr4__ _le6mbhl 1n37ehkb _m75f91n _qj3bzfz 1939yygw 11i5z6x8 _1k5f8xs 1509441m 15t5lwgf _ae2th1n _tg1ugcv 1lp1ugcv 16e14up_ _h55rw7n _ny9yavn _7a11xb_ 1ih442g9 _pv442g9 1mv16xof 14e6y7tu 1oo9zkds 17d1cisi _4v9y70f _y98m8kc 1019pq0v 12o9zda8 _348j4f4 1et50i2o _8epa8__ _ts6senj 1o350i2o 1mi9eiuo 1259yrp0 1ln80gnw _632xcoy 1cn9zldc _f29edu4 1n490c8q _9f9ziet 1b94vk74 _m49zkct 1kz6s73a 1eu9dtog _q58s1rz 1dy9sjiq __u89jo3 _aj5nkwg _ld89jo3 13h9z6wx _qa9z2ii _l119xgq _bs5arju 1hj4nwk9 1qt4nwk9 1ge6wau6 14j9zlcw 11p1edc_ _ms1zcxe _439shk6 _jt9y70f _754zsow 1la40eju _oq5p___ _x279qkz 1fa5r3rv _yd2d9ip _424tcku _8y1di2_ _zi2uabw _yy7rn9h 12yz980_ __39ljp6 1b59zg0x _n39zfzp 1fy9zest _b33k___ _hp9wq92 1il50hz4 _io472ub _lj9z3eo 19z9ykg0 _8t8iu3a 12b9bl4a 1ak5yw0o _896v4ku _tb8k8lv _s59zi6t _c09ze0p 1lg80oqn 1id9z8wb _238nba5 1kq6wgdi _154zssg _tn3zk49 _da9y6tc 1sg7cv4f _r12jvtt 1gq5fmkz 1cs9rvci _lp9jn1c _xw1tdnb 13f9zje6 16f6973h _vo7ir40 _bt5arjf _rc45e4t _hr4e100 10v4e100 _hc9zke2 _w91egv_ _sj2r1kk 13c87yx8 _vqpds__ _ni8ggk8 _tj9yqfb 1ia2j4r4 _7x9b10u 1fc9ld4j 1eq9zldr _5j9lhpx _ez9zl6o _md61fzm".split(" ").reduce((acc, next) => {
  const key = colorToInt(next.substring(0, 3));
  const hex = colorToInt(next.substring(3)).toString(16);
  let prefix = "";
  for (let i = 0; i < 6 - hex.length; i++) {
    prefix += "0";
  }
  acc[key] = `${prefix}${hex}`;
  return acc;
}, {});
function nameToHex(color2) {
  const normalizedColorName = color2.toLowerCase().trim();
  const result = compressedColorMap[hash(normalizedColorName)];
  if (!result) throw new ColorError$1(color2);
  return `#${result}`;
}
__name(nameToHex, "nameToHex");
var r = /* @__PURE__ */ __name((str, amount) => Array.from(Array(amount)).map(() => str).join(""), "r");
var reducedHexRegex = new RegExp(`^#${r("([a-f0-9])", 3)}([a-f0-9])?$`, "i");
var hexRegex = new RegExp(`^#${r("([a-f0-9]{2})", 3)}([a-f0-9]{2})?$`, "i");
var rgbaRegex = new RegExp(`^rgba?\\(\\s*(\\d+)\\s*${r(",\\s*(\\d+)\\s*", 2)}(?:,\\s*([\\d.]+))?\\s*\\)$`, "i");
var hslaRegex = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i;
var namedColorRegex = /^[a-z]+$/i;
var roundColor = /* @__PURE__ */ __name((color2) => {
  return Math.round(color2 * 255);
}, "roundColor");
var hslToRgb = /* @__PURE__ */ __name((hue, saturation, lightness) => {
  let l = lightness / 100;
  if (saturation === 0) {
    return [l, l, l].map(roundColor);
  }
  const huePrime = (hue % 360 + 360) % 360 / 60;
  const chroma = (1 - Math.abs(2 * l - 1)) * (saturation / 100);
  const secondComponent = chroma * (1 - Math.abs(huePrime % 2 - 1));
  let red3 = 0;
  let green3 = 0;
  let blue3 = 0;
  if (huePrime >= 0 && huePrime < 1) {
    red3 = chroma;
    green3 = secondComponent;
  } else if (huePrime >= 1 && huePrime < 2) {
    red3 = secondComponent;
    green3 = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green3 = chroma;
    blue3 = secondComponent;
  } else if (huePrime >= 3 && huePrime < 4) {
    green3 = secondComponent;
    blue3 = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red3 = secondComponent;
    blue3 = chroma;
  } else if (huePrime >= 5 && huePrime < 6) {
    red3 = chroma;
    blue3 = secondComponent;
  }
  const lightnessModification = l - chroma / 2;
  const finalRed = red3 + lightnessModification;
  const finalGreen = green3 + lightnessModification;
  const finalBlue = blue3 + lightnessModification;
  return [finalRed, finalGreen, finalBlue].map(roundColor);
}, "hslToRgb");
function parseToHsla(color2) {
  const [red3, green3, blue3, alpha] = parseToRgba(color2).map((value, index) => (
    // 3rd index is alpha channel which is already normalized
    index === 3 ? value : value / 255
  ));
  const max = Math.max(red3, green3, blue3);
  const min = Math.min(red3, green3, blue3);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness, alpha];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue = 60 * (red3 === max ? (green3 - blue3) / delta + (green3 < blue3 ? 6 : 0) : green3 === max ? (blue3 - red3) / delta + 2 : (red3 - green3) / delta + 4);
  return [hue, saturation, lightness, alpha];
}
__name(parseToHsla, "parseToHsla");
function hsla(hue, saturation, lightness, alpha) {
  return `hsla(${(hue % 360).toFixed()}, ${guard(0, 100, saturation * 100).toFixed()}%, ${guard(0, 100, lightness * 100).toFixed()}%, ${parseFloat(guard(0, 1, alpha).toFixed(3))})`;
}
__name(hsla, "hsla");

// ../node_modules/@tamagui/theme-builder/dist/esm/helpers.mjs
var objectKeys = /* @__PURE__ */ __name((obj) => Object.keys(obj), "objectKeys");
function objectFromEntries2(arr) {
  return Object.fromEntries(arr);
}
__name(objectFromEntries2, "objectFromEntries");

// ../node_modules/@tamagui/theme-builder/dist/esm/defaultTemplates.mjs
var getTemplates = /* @__PURE__ */ __name(() => {
  const lightTemplates = getBaseTemplates("light"), darkTemplates = getBaseTemplates("dark");
  return {
    ...objectFromEntries2(objectKeys(lightTemplates).map((name) => [`light_${name}`, lightTemplates[name]])),
    ...objectFromEntries2(objectKeys(darkTemplates).map((name) => [`dark_${name}`, darkTemplates[name]]))
  };
}, "getTemplates");
var getBaseTemplates = /* @__PURE__ */ __name((scheme) => {
  const isLight = scheme === "light", bgIndex = 6, lighten = isLight ? -1 : 1, darken = -lighten, borderColor = bgIndex + 3, baseColors = {
    color: -bgIndex,
    colorHover: -bgIndex - 1,
    colorPress: -bgIndex,
    colorFocus: -bgIndex - 1,
    placeholderColor: -bgIndex - 3,
    outlineColor: -2
  }, base = {
    accentBackground: 0,
    accentColor: -0,
    background0: 1,
    background02: 2,
    background04: 3,
    background06: 4,
    background08: 5,
    color1: bgIndex,
    color2: bgIndex + 1,
    color3: bgIndex + 2,
    color4: bgIndex + 3,
    color5: bgIndex + 4,
    color6: bgIndex + 5,
    color7: bgIndex + 6,
    color8: bgIndex + 7,
    color9: bgIndex + 8,
    color10: bgIndex + 9,
    color11: bgIndex + 10,
    color12: bgIndex + 11,
    color0: -1,
    color02: -2,
    color04: -3,
    color06: -4,
    color08: -5,
    // the background, color, etc keys here work like generics - they make it so you
    // can publish components for others to use without mandating a specific color scale
    // the @tamagui/button Button component looks for `$background`, so you set the
    // dark_red_Button theme to have a stronger background than the dark_red theme.
    background: bgIndex,
    backgroundHover: bgIndex + lighten,
    // always lighten on hover no matter the scheme
    backgroundPress: bgIndex + darken,
    // always darken on press no matter the theme
    backgroundFocus: bgIndex + darken,
    borderColor,
    borderColorHover: borderColor + lighten,
    borderColorPress: borderColor + darken,
    borderColorFocus: borderColor,
    ...baseColors,
    colorTransparent: -1
  }, surface12 = {
    ...baseColors,
    background: base.background + 1,
    backgroundHover: base.backgroundHover + 1,
    backgroundPress: base.backgroundPress + 1,
    backgroundFocus: base.backgroundFocus + 1,
    borderColor: base.borderColor + 1,
    borderColorHover: base.borderColorHover + 1,
    borderColorFocus: base.borderColorFocus + 1,
    borderColorPress: base.borderColorPress + 1
  }, surface22 = {
    ...baseColors,
    background: base.background + 2,
    backgroundHover: base.backgroundHover + 2,
    backgroundPress: base.backgroundPress + 2,
    backgroundFocus: base.backgroundFocus + 2,
    borderColor: base.borderColor + 2,
    borderColorHover: base.borderColorHover + 2,
    borderColorFocus: base.borderColorFocus + 2,
    borderColorPress: base.borderColorPress + 2
  }, surface32 = {
    ...baseColors,
    background: base.background + 3,
    backgroundHover: base.backgroundHover + 3,
    backgroundPress: base.backgroundPress + 3,
    backgroundFocus: base.backgroundFocus + 3,
    borderColor: base.borderColor + 3,
    borderColorHover: base.borderColorHover + 3,
    borderColorFocus: base.borderColorFocus + 3,
    borderColorPress: base.borderColorPress + 3
  }, alt1 = {
    color: base.color - 1,
    colorHover: base.colorHover - 1,
    colorPress: base.colorPress - 1,
    colorFocus: base.colorFocus - 1
  }, alt2 = {
    color: base.color - 2,
    colorHover: base.colorHover - 2,
    colorPress: base.colorPress - 2,
    colorFocus: base.colorFocus - 2
  }, inverse = Object.fromEntries(Object.entries(base).map(([key, index]) => [key, -index]));
  return {
    base,
    surface1: surface12,
    surface2: surface22,
    surface3: surface32,
    alt1,
    alt2,
    inverse
  };
}, "getBaseTemplates");
var defaultTemplates = getTemplates();

// ../node_modules/@tamagui/theme-builder/dist/esm/getThemeSuitePalettes.mjs
var paletteSize = 12;
var generateColorPalette = /* @__PURE__ */ __name(({
  palette: buildPalette,
  scheme
}) => {
  if (!buildPalette) return [];
  const {
    anchors
  } = buildPalette;
  let palette = [];
  const add = /* @__PURE__ */ __name((h, s, l) => {
    palette.push(hsla(h, s, l, 1));
  }, "add"), numAnchors = Object.keys(anchors).length;
  for (const [anchorIndex, anchor] of anchors.entries()) {
    const [h, s, l] = [anchor.hue[scheme], anchor.sat[scheme], anchor.lum[scheme]];
    if (anchorIndex !== 0) {
      const lastAnchor = anchors[anchorIndex - 1], steps = anchor.index - lastAnchor.index, lastHue = lastAnchor.hue[scheme], lastSat = lastAnchor.sat[scheme], lastLum = lastAnchor.lum[scheme], stepHue = (lastHue - h) / steps, stepSat = (lastSat - s) / steps, stepLum = (lastLum - l) / steps;
      for (let step = lastAnchor.index + 1; step < anchor.index; step++) {
        const str = anchor.index - step;
        add(h + stepHue * str, s + stepSat * str, l + stepLum * str);
      }
    }
    if (add(h, s, l), anchorIndex === numAnchors - 1 && palette.length < paletteSize) for (let step = anchor.index + 1; step < paletteSize; step++) add(h, s, l);
  }
  const background = palette[0], foreground = palette[palette.length - 1], transparentValues = [background, foreground].map((color2) => {
    const [h, s, l] = parseToHsla(color2);
    return [hsla(h, s, l, 0), hsla(h, s, l, 0.2), hsla(h, s, l, 0.4), hsla(h, s, l, 0.6), hsla(h, s, l, 0.8)];
  }), reverseForeground = [...transparentValues[1]].reverse();
  return palette = [...transparentValues[0], ...palette, ...reverseForeground], palette;
}, "generateColorPalette");
function getThemeSuitePalettes(palette) {
  return {
    light: generateColorPalette({
      palette,
      scheme: "light"
    }),
    dark: generateColorPalette({
      palette,
      scheme: "dark"
    })
  };
}
__name(getThemeSuitePalettes, "getThemeSuitePalettes");

// ../node_modules/@tamagui/theme-builder/dist/esm/createThemes.mjs
var defaultPalettes = createPalettes(getThemesPalettes({
  base: {
    palette: ["#fff", "#000"]
  },
  accent: {
    palette: ["#ff0000", "#ff9999"]
  }
}));
function getSchemePalette(colors) {
  return {
    light: colors,
    dark: [...colors].reverse()
  };
}
__name(getSchemePalette, "getSchemePalette");
function getAnchors(palette) {
  const numItems = palette.light.length;
  return palette.light.map((lcolor, index) => {
    const dcolor = palette.dark[index], [lhue, lsat, llum] = parseToHsla(lcolor), [dhue, dsat, dlum] = parseToHsla(dcolor);
    return {
      index: spreadIndex(11, numItems, index),
      hue: {
        light: lhue,
        dark: dhue
      },
      sat: {
        light: lsat,
        dark: dsat
      },
      lum: {
        light: llum,
        dark: dlum
      }
    };
  });
}
__name(getAnchors, "getAnchors");
function spreadIndex(maxIndex, numItems, index) {
  return Math.round(index / (numItems - 1) * maxIndex);
}
__name(spreadIndex, "spreadIndex");
function coerceSimplePaletteToSchemePalette(def) {
  return Array.isArray(def) ? getSchemePalette(def) : def;
}
__name(coerceSimplePaletteToSchemePalette, "coerceSimplePaletteToSchemePalette");
function getThemesPalettes(props) {
  const base = coerceSimplePaletteToSchemePalette(props.base.palette), accent = props.accent ? coerceSimplePaletteToSchemePalette(props.accent.palette) : null, baseAnchors = getAnchors(base);
  function getSubThemesPalettes(defs) {
    return Object.fromEntries(Object.entries(defs).map(([key, value]) => [key, {
      name: key,
      anchors: value.palette ? getAnchors(coerceSimplePaletteToSchemePalette(value.palette)) : baseAnchors
    }]));
  }
  __name(getSubThemesPalettes, "getSubThemesPalettes");
  return {
    base: {
      name: "base",
      anchors: baseAnchors
    },
    ...accent && {
      accent: {
        name: "accent",
        anchors: getAnchors(accent)
      }
    },
    ...props.childrenThemes && getSubThemesPalettes(props.childrenThemes),
    ...props.grandChildrenThemes && getSubThemesPalettes(props.grandChildrenThemes)
  };
}
__name(getThemesPalettes, "getThemesPalettes");
function createPalettes(palettes) {
  const accentPalettes = palettes.accent ? getThemeSuitePalettes(palettes.accent) : null, basePalettes = getThemeSuitePalettes(palettes.base);
  return Object.fromEntries(Object.entries(palettes).flatMap(([name, palette]) => {
    const palettes2 = getThemeSuitePalettes(palette), oppositePalettes = name.startsWith("accent") ? basePalettes : accentPalettes || basePalettes;
    if (!oppositePalettes) return [];
    const oppositeLight = oppositePalettes.light, oppositeDark = oppositePalettes.dark, bgOffset = 7;
    return [[name === "base" ? "light" : `light_${name}`, [oppositeLight[bgOffset], ...palettes2.light, oppositeLight[oppositeLight.length - bgOffset - 1]]], [name === "base" ? "dark" : `dark_${name}`, [oppositeDark[oppositeDark.length - bgOffset - 1], ...palettes2.dark, oppositeDark[bgOffset]]]];
  }));
}
__name(createPalettes, "createPalettes");

// ../node_modules/@tamagui/theme-builder/dist/esm/defaultTemplatesStronger.mjs
var getTemplates2 = /* @__PURE__ */ __name(() => {
  const lightTemplates = getBaseTemplates2("light"), darkTemplates = getBaseTemplates2("dark");
  return {
    ...objectFromEntries2(objectKeys(lightTemplates).map((name) => [`light_${name}`, lightTemplates[name]])),
    ...objectFromEntries2(objectKeys(darkTemplates).map((name) => [`dark_${name}`, darkTemplates[name]]))
  };
}, "getTemplates");
var getBaseTemplates2 = /* @__PURE__ */ __name((scheme) => {
  const isLight = scheme === "light", bgIndex = 6, lighten = isLight ? -1 : 1, darken = -lighten, borderColor = bgIndex + 3, baseColors = {
    color: -bgIndex,
    colorHover: -bgIndex - 1,
    colorPress: -bgIndex,
    colorFocus: -bgIndex - 1,
    placeholderColor: -bgIndex - 3,
    outlineColor: -2
  }, base = {
    accentBackground: 0,
    accentColor: -0,
    background0: 1,
    background02: 2,
    background04: 3,
    background06: 4,
    background08: 5,
    color1: bgIndex,
    color2: bgIndex + 1,
    color3: bgIndex + 2,
    color4: bgIndex + 3,
    color5: bgIndex + 4,
    color6: bgIndex + 5,
    color7: bgIndex + 6,
    color8: bgIndex + 7,
    color9: bgIndex + 8,
    color10: bgIndex + 9,
    color11: bgIndex + 10,
    color12: bgIndex + 11,
    color0: -1,
    color02: -2,
    color04: -3,
    color06: -4,
    color08: -5,
    // the background, color, etc keys here work like generics - they make it so you
    // can publish components for others to use without mandating a specific color scale
    // the @tamagui/button Button component looks for `$background`, so you set the
    // dark_red_Button theme to have a stronger background than the dark_red theme.
    background: bgIndex,
    backgroundHover: bgIndex + lighten,
    // always lighten on hover no matter the scheme
    backgroundPress: bgIndex + darken,
    // always darken on press no matter the theme
    backgroundFocus: bgIndex + darken,
    borderColor,
    borderColorHover: borderColor + lighten,
    borderColorPress: borderColor + darken,
    borderColorFocus: borderColor,
    ...baseColors,
    colorTransparent: -1
  }, surface12 = {
    ...baseColors,
    background: base.background + 2,
    backgroundHover: base.backgroundHover + 2,
    backgroundPress: base.backgroundPress + 2,
    backgroundFocus: base.backgroundFocus + 2,
    borderColor: base.borderColor + 2,
    borderColorHover: base.borderColorHover + 2,
    borderColorFocus: base.borderColorFocus + 2,
    borderColorPress: base.borderColorPress + 2
  }, surface22 = {
    ...baseColors,
    background: base.background + 3,
    backgroundHover: base.backgroundHover + 3,
    backgroundPress: base.backgroundPress + 3,
    backgroundFocus: base.backgroundFocus + 3,
    borderColor: base.borderColor + 3,
    borderColorHover: base.borderColorHover + 3,
    borderColorFocus: base.borderColorFocus + 3,
    borderColorPress: base.borderColorPress + 3
  }, surface32 = {
    ...baseColors,
    background: base.background + 4,
    backgroundHover: base.backgroundHover + 4,
    backgroundPress: base.backgroundPress + 4,
    backgroundFocus: base.backgroundFocus + 4,
    borderColor: base.borderColor + 4,
    borderColorHover: base.borderColorHover + 4,
    borderColorFocus: base.borderColorFocus + 4,
    borderColorPress: base.borderColorPress + 4
  }, alt1 = {
    color: base.color - 1,
    colorHover: base.colorHover - 1,
    colorPress: base.colorPress - 1,
    colorFocus: base.colorFocus - 1
  }, alt2 = {
    color: base.color - 2,
    colorHover: base.colorHover - 2,
    colorPress: base.colorPress - 2,
    colorFocus: base.colorFocus - 2
  }, inverse = Object.fromEntries(Object.entries(base).map(([key, index]) => [key, -index]));
  return {
    base,
    surface1: surface12,
    surface2: surface22,
    surface3: surface32,
    alt1,
    alt2,
    inverse
  };
}, "getBaseTemplates");
var defaultTemplatesStronger = getTemplates2();

// ../node_modules/@tamagui/theme-builder/dist/esm/defaultTemplatesStrongest.mjs
var getTemplates3 = /* @__PURE__ */ __name(() => {
  const lightTemplates = getBaseTemplates3("light"), darkTemplates = getBaseTemplates3("dark");
  return {
    ...objectFromEntries2(objectKeys(lightTemplates).map((name) => [`light_${name}`, lightTemplates[name]])),
    ...objectFromEntries2(objectKeys(darkTemplates).map((name) => [`dark_${name}`, darkTemplates[name]]))
  };
}, "getTemplates");
var getBaseTemplates3 = /* @__PURE__ */ __name((scheme) => {
  const isLight = scheme === "light", bgIndex = 6, lighten = isLight ? -1 : 1, darken = -lighten, borderColor = bgIndex + 3, baseColors = {
    color: -bgIndex,
    colorHover: -bgIndex - 1,
    colorPress: -bgIndex,
    colorFocus: -bgIndex - 1,
    placeholderColor: -bgIndex - 3,
    outlineColor: -2
  }, base = {
    accentBackground: 0,
    accentColor: -0,
    background0: 1,
    background02: 2,
    background04: 3,
    background06: 4,
    background08: 5,
    color1: bgIndex,
    color2: bgIndex + 1,
    color3: bgIndex + 2,
    color4: bgIndex + 3,
    color5: bgIndex + 4,
    color6: bgIndex + 5,
    color7: bgIndex + 6,
    color8: bgIndex + 7,
    color9: bgIndex + 8,
    color10: bgIndex + 9,
    color11: bgIndex + 10,
    color12: bgIndex + 11,
    color0: -1,
    color02: -2,
    color04: -3,
    color06: -4,
    color08: -5,
    // the background, color, etc keys here work like generics - they make it so you
    // can publish components for others to use without mandating a specific color scale
    // the @tamagui/button Button component looks for `$background`, so you set the
    // dark_red_Button theme to have a stronger background than the dark_red theme.
    background: bgIndex,
    backgroundHover: bgIndex + lighten,
    // always lighten on hover no matter the scheme
    backgroundPress: bgIndex + darken,
    // always darken on press no matter the theme
    backgroundFocus: bgIndex + darken,
    borderColor,
    borderColorHover: borderColor + lighten,
    borderColorPress: borderColor + darken,
    borderColorFocus: borderColor,
    ...baseColors,
    colorTransparent: -1
  }, surface12 = {
    ...baseColors,
    background: base.background + 3,
    backgroundHover: base.backgroundHover + 3,
    backgroundPress: base.backgroundPress + 3,
    backgroundFocus: base.backgroundFocus + 3,
    borderColor: base.borderColor + 3,
    borderColorHover: base.borderColorHover + 3,
    borderColorFocus: base.borderColorFocus + 3,
    borderColorPress: base.borderColorPress + 3
  }, surface22 = {
    ...baseColors,
    background: base.background + 4,
    backgroundHover: base.backgroundHover + 4,
    backgroundPress: base.backgroundPress + 4,
    backgroundFocus: base.backgroundFocus + 4,
    borderColor: base.borderColor + 4,
    borderColorHover: base.borderColorHover + 4,
    borderColorFocus: base.borderColorFocus + 4,
    borderColorPress: base.borderColorPress + 4
  }, surface32 = {
    ...baseColors,
    background: base.background + 5,
    backgroundHover: base.backgroundHover + 5,
    backgroundPress: base.backgroundPress + 5,
    backgroundFocus: base.backgroundFocus + 5,
    borderColor: base.borderColor + 5,
    borderColorHover: base.borderColorHover + 5,
    borderColorFocus: base.borderColorFocus + 5,
    borderColorPress: base.borderColorPress + 5
  }, alt1 = {
    color: base.color - 1,
    colorHover: base.colorHover - 1,
    colorPress: base.colorPress - 1,
    colorFocus: base.colorFocus - 1
  }, alt2 = {
    color: base.color - 2,
    colorHover: base.colorHover - 2,
    colorPress: base.colorPress - 2,
    colorFocus: base.colorFocus - 2
  }, inverse = Object.fromEntries(Object.entries(base).map(([key, index]) => [key, -index]));
  return {
    base,
    surface1: surface12,
    surface2: surface22,
    surface3: surface32,
    alt1,
    alt2,
    inverse
  };
}, "getBaseTemplates");
var defaultTemplatesStrongest = getTemplates3();

// ../node_modules/@tamagui/theme-builder/dist/esm/masks.mjs
var masks = {
  identity: createIdentityMask(),
  soften: createSoftenMask(),
  soften2: createSoftenMask({
    strength: 2
  }),
  soften3: createSoftenMask({
    strength: 3
  }),
  strengthen: createStrengthenMask(),
  inverse: createInverseMask(),
  inverseSoften: combineMasks(createInverseMask(), createSoftenMask({
    strength: 2
  })),
  inverseSoften2: combineMasks(createInverseMask(), createSoftenMask({
    strength: 3
  })),
  inverseSoften3: combineMasks(createInverseMask(), createSoftenMask({
    strength: 4
  })),
  inverseStrengthen2: combineMasks(createInverseMask(), createStrengthenMask({
    strength: 2
  })),
  strengthenButSoftenBorder: createMask((template, options) => {
    const stronger = createStrengthenMask().mask(template, options), softer = createSoftenMask().mask(template, options);
    return {
      ...stronger,
      borderColor: softer.borderColor,
      borderColorHover: softer.borderColorHover,
      borderColorPress: softer.borderColorPress,
      borderColorFocus: softer.borderColorFocus
    };
  }),
  soften2Border1: createMask((template, options) => {
    const softer2 = createSoftenMask({
      strength: 2
    }).mask(template, options), softer1 = createSoftenMask({
      strength: 1
    }).mask(template, options);
    return {
      ...softer2,
      borderColor: softer1.borderColor,
      borderColorHover: softer1.borderColorHover,
      borderColorPress: softer1.borderColorPress,
      borderColorFocus: softer1.borderColorFocus
    };
  }),
  soften3FlatBorder: createMask((template, options) => {
    const borderMask = createSoftenMask({
      strength: 2
    }).mask(template, options);
    return {
      ...createSoftenMask({
        strength: 3
      }).mask(template, options),
      borderColor: borderMask.borderColor,
      borderColorHover: borderMask.borderColorHover,
      borderColorPress: borderMask.borderColorPress,
      borderColorFocus: borderMask.borderColorFocus
    };
  }),
  softenBorder: createMask((template, options) => {
    const plain = skipMask.mask(template, options), softer = createSoftenMask().mask(template, options);
    return {
      ...plain,
      borderColor: softer.borderColor,
      borderColorHover: softer.borderColorHover,
      borderColorPress: softer.borderColorPress,
      borderColorFocus: softer.borderColorFocus
    };
  }),
  softenBorder2: createMask((template, options) => {
    const plain = skipMask.mask(template, options), softer = createSoftenMask({
      strength: 2
    }).mask(template, options);
    return {
      ...plain,
      borderColor: softer.borderColor,
      borderColorHover: softer.borderColorHover,
      borderColorPress: softer.borderColorPress,
      borderColorFocus: softer.borderColorFocus
    };
  })
};

// ../node_modules/@tamagui/themes/dist/esm/v3-themes.mjs
var import_web = require("@tamagui/core");

// ../node_modules/@tamagui/themes/dist/esm/utils.mjs
function postfixObjKeys(obj, postfix) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${k}${postfix}`, v]));
}
__name(postfixObjKeys, "postfixObjKeys");
function sizeToSpace(v) {
  return v === 0 ? 0 : v === 2 ? 0.5 : v === 4 ? 1 : v === 8 ? 1.5 : v <= 16 ? Math.round(v * 0.333) : Math.floor(v * 0.7 - 12);
}
__name(sizeToSpace, "sizeToSpace");
function objectKeys2(obj) {
  return Object.keys(obj);
}
__name(objectKeys2, "objectKeys");

// ../node_modules/@tamagui/themes/dist/esm/v3-tokens.mjs
var size = {
  $0: 0,
  "$0.25": 2,
  "$0.5": 4,
  "$0.75": 8,
  $1: 20,
  "$1.5": 24,
  $2: 28,
  "$2.5": 32,
  $3: 36,
  "$3.5": 40,
  $4: 44,
  $true: 44,
  "$4.5": 48,
  $5: 52,
  $6: 64,
  $7: 74,
  $8: 84,
  $9: 94,
  $10: 104,
  $11: 124,
  $12: 144,
  $13: 164,
  $14: 184,
  $15: 204,
  $16: 224,
  $17: 224,
  $18: 244,
  $19: 264,
  $20: 284
};
var spaces = Object.entries(size).map(([k, v]) => [k, sizeToSpace(v)]);
var spacesNegative = spaces.slice(1).map(([k, v]) => [`-${k.slice(1)}`, -v]);
var space = {
  ...Object.fromEntries(spaces),
  ...Object.fromEntries(spacesNegative)
};
var zIndex = {
  0: 0,
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500
};
var radius = {
  0: 0,
  1: 3,
  2: 5,
  3: 7,
  4: 9,
  true: 9,
  5: 10,
  6: 16,
  7: 19,
  8: 22,
  9: 26,
  10: 34,
  11: 42,
  12: 50
};
var tokens = {
  radius,
  zIndex,
  space,
  size
};

// ../node_modules/@tamagui/themes/dist/esm/v3-themes.mjs
var colorTokens = {
  light: {
    blue: blue2,
    gray: gray2,
    green: green2,
    orange: orange2,
    pink: pink2,
    purple: purple2,
    red: red2,
    yellow: yellow2
  },
  dark: {
    blue,
    gray,
    green,
    orange,
    pink,
    purple,
    red,
    yellow
  }
};
var lightShadowColor = "rgba(0,0,0,0.04)";
var lightShadowColorStrong = "rgba(0,0,0,0.085)";
var darkShadowColor = "rgba(0,0,0,0.2)";
var darkShadowColorStrong = "rgba(0,0,0,0.3)";
var darkColors = {
  ...colorTokens.dark.blue,
  ...colorTokens.dark.gray,
  ...colorTokens.dark.green,
  ...colorTokens.dark.orange,
  ...colorTokens.dark.pink,
  ...colorTokens.dark.purple,
  ...colorTokens.dark.red,
  ...colorTokens.dark.yellow
};
var lightColors = {
  ...colorTokens.light.blue,
  ...colorTokens.light.gray,
  ...colorTokens.light.green,
  ...colorTokens.light.orange,
  ...colorTokens.light.pink,
  ...colorTokens.light.purple,
  ...colorTokens.light.red,
  ...colorTokens.light.yellow
};
var color = {
  white0: "rgba(255,255,255,0)",
  white075: "rgba(255,255,255,0.75)",
  white05: "rgba(255,255,255,0.5)",
  white025: "rgba(255,255,255,0.25)",
  black0: "rgba(10,10,10,0)",
  black075: "rgba(10,10,10,0.75)",
  black05: "rgba(10,10,10,0.5)",
  black025: "rgba(10,10,10,0.25)",
  white1: "#fff",
  white2: "#f8f8f8",
  white3: "hsl(0, 0%, 96.3%)",
  white4: "hsl(0, 0%, 94.1%)",
  white5: "hsl(0, 0%, 92.0%)",
  white6: "hsl(0, 0%, 90.0%)",
  white7: "hsl(0, 0%, 88.5%)",
  white8: "hsl(0, 0%, 81.0%)",
  white9: "hsl(0, 0%, 56.1%)",
  white10: "hsl(0, 0%, 50.3%)",
  white11: "hsl(0, 0%, 42.5%)",
  white12: "hsl(0, 0%, 9.0%)",
  black1: "#050505",
  black2: "#151515",
  black3: "#191919",
  black4: "#232323",
  black5: "#282828",
  black6: "#323232",
  black7: "#424242",
  black8: "#494949",
  black9: "#545454",
  black10: "#626262",
  black11: "#a5a5a5",
  black12: "#fff",
  ...postfixObjKeys(lightColors, "Light"),
  ...postfixObjKeys(darkColors, "Dark")
};
var defaultPalettes2 = (() => {
  const transparent = /* @__PURE__ */ __name((hsl, opacity = 0) => hsl.replace("%)", `%, ${opacity})`).replace("hsl(", "hsla("), "transparent"), getColorPalette = /* @__PURE__ */ __name((colors, accentColors) => {
    const colorPalette = Object.values(colors), colorI = colorPalette.length - 4, accentPalette = Object.values(accentColors), accentBackground = accentPalette[0], accentColor = accentPalette[accentPalette.length - 1];
    return [accentBackground, transparent(colorPalette[0], 0), transparent(colorPalette[0], 0.25), transparent(colorPalette[0], 0.5), transparent(colorPalette[0], 0.75), ...colorPalette, transparent(colorPalette[colorI], 0.75), transparent(colorPalette[colorI], 0.5), transparent(colorPalette[colorI], 0.25), transparent(colorPalette[colorI], 0), accentColor];
  }, "getColorPalette"), brandColor = {
    light: color.blue4Light,
    dark: color.blue4Dark
  }, lightPalette = [brandColor.light, color.white0, color.white025, color.white05, color.white075, color.white1, color.white2, color.white3, color.white4, color.white5, color.white6, color.white7, color.white8, color.white9, color.white10, color.white11, color.white12, color.black075, color.black05, color.black025, color.black0, brandColor.dark], darkPalette = [brandColor.dark, color.black0, color.black025, color.black05, color.black075, color.black1, color.black2, color.black3, color.black4, color.black5, color.black6, color.black7, color.black8, color.black9, color.black10, color.black11, color.black12, color.white075, color.white05, color.white025, color.white0, brandColor.light], lightColorNames = objectKeys2(colorTokens.light), lightPalettes = objectFromEntries(lightColorNames.map((key, index) => [`light_${key}`, getColorPalette(colorTokens.light[key], colorTokens.light[lightColorNames[(index + 1) % lightColorNames.length]])])), darkColorNames = objectKeys2(colorTokens.dark), darkPalettes = objectFromEntries(darkColorNames.map((key, index) => [`dark_${key}`, getColorPalette(colorTokens.dark[key], colorTokens.light[darkColorNames[(index + 1) % darkColorNames.length]])])), colorPalettes = {
    ...lightPalettes,
    ...darkPalettes
  };
  return {
    light: lightPalette,
    dark: darkPalette,
    ...colorPalettes
  };
})();
var getTemplates4 = /* @__PURE__ */ __name(() => {
  const getBaseTemplates4 = /* @__PURE__ */ __name((scheme) => {
    const isLight = scheme === "light", bgIndex = 5, lighten = isLight ? -1 : 1, darken = -lighten, borderColor = bgIndex + 3, base = {
      accentBackground: 0,
      accentColor: -0,
      background0: 1,
      background025: 2,
      background05: 3,
      background075: 4,
      color1: bgIndex,
      color2: bgIndex + 1,
      color3: bgIndex + 2,
      color4: bgIndex + 3,
      color5: bgIndex + 4,
      color6: bgIndex + 5,
      color7: bgIndex + 6,
      color8: bgIndex + 7,
      color9: bgIndex + 8,
      color10: bgIndex + 9,
      color11: bgIndex + 10,
      color12: bgIndex + 11,
      color0: -1,
      color025: -2,
      color05: -3,
      color075: -4,
      // the background, color, etc keys here work like generics - they make it so you
      // can publish components for others to use without mandating a specific color scale
      // the @tamagui/button Button component looks for `$background`, so you set the
      // dark_red_Button theme to have a stronger background than the dark_red theme.
      background: bgIndex,
      backgroundHover: bgIndex + lighten,
      // always lighten on hover no matter the scheme
      backgroundPress: bgIndex + darken,
      // always darken on press no matter the theme
      backgroundFocus: bgIndex + darken,
      borderColor,
      borderColorHover: borderColor + lighten,
      borderColorPress: borderColor + darken,
      borderColorFocus: borderColor,
      color: -bgIndex,
      colorHover: -bgIndex - 1,
      colorPress: -bgIndex,
      colorFocus: -bgIndex - 1,
      colorTransparent: -1,
      placeholderColor: -bgIndex - 3,
      outlineColor: -2
    }, surface12 = {
      background: base.background + 1,
      backgroundHover: base.backgroundHover + 1,
      backgroundPress: base.backgroundPress + 1,
      backgroundFocus: base.backgroundFocus + 1,
      borderColor: base.borderColor + 1,
      borderColorHover: base.borderColorHover + 1,
      borderColorFocus: base.borderColorFocus + 1,
      borderColorPress: base.borderColorPress + 1
    }, surface22 = {
      background: base.background + 2,
      backgroundHover: base.backgroundHover + 2,
      backgroundPress: base.backgroundPress + 2,
      backgroundFocus: base.backgroundFocus + 2,
      borderColor: base.borderColor + 2,
      borderColorHover: base.borderColorHover + 2,
      borderColorFocus: base.borderColorFocus + 2,
      borderColorPress: base.borderColorPress + 2
    }, surface32 = {
      background: base.background + 3,
      backgroundHover: base.backgroundHover + 3,
      backgroundPress: base.backgroundPress + 3,
      backgroundFocus: base.backgroundFocus + 3,
      borderColor: base.borderColor + 3,
      borderColorHover: base.borderColorHover + 3,
      borderColorFocus: base.borderColorFocus + 3,
      borderColorPress: base.borderColorPress + 3
    }, surfaceActiveBg = {
      background: base.background + 5,
      backgroundHover: base.background + 5,
      backgroundPress: base.backgroundPress + 5,
      backgroundFocus: base.backgroundFocus + 5
    }, surfaceActive = {
      ...surfaceActiveBg,
      // match border to background when active
      borderColor: surfaceActiveBg.background,
      borderColorHover: surfaceActiveBg.backgroundHover,
      borderColorFocus: surfaceActiveBg.backgroundFocus,
      borderColorPress: surfaceActiveBg.backgroundPress
    }, inverseSurface12 = {
      color: surface12.background,
      colorHover: surface12.backgroundHover,
      colorPress: surface12.backgroundPress,
      colorFocus: surface12.backgroundFocus,
      background: base.color,
      backgroundHover: base.colorHover,
      backgroundPress: base.colorPress,
      backgroundFocus: base.colorFocus,
      borderColor: base.color - 2,
      borderColorHover: base.color - 3,
      borderColorFocus: base.color - 4,
      borderColorPress: base.color - 5
    }, inverseActive = {
      ...inverseSurface12,
      background: base.color - 2,
      backgroundHover: base.colorHover - 2,
      backgroundPress: base.colorPress - 2,
      backgroundFocus: base.colorFocus - 2,
      borderColor: base.color - 2 - 2,
      borderColorHover: base.color - 3 - 2,
      borderColorFocus: base.color - 4 - 2,
      borderColorPress: base.color - 5 - 2
    }, alt1 = {
      color: base.color - 1,
      colorHover: base.colorHover - 1,
      colorPress: base.colorPress - 1,
      colorFocus: base.colorFocus - 1
    }, alt2 = {
      color: base.color - 2,
      colorHover: base.colorHover - 2,
      colorPress: base.colorPress - 2,
      colorFocus: base.colorFocus - 2
    };
    return {
      base,
      alt1,
      alt2,
      surface1: surface12,
      surface2: surface22,
      surface3: surface32,
      inverseSurface1: inverseSurface12,
      inverseActive,
      surfaceActive
    };
  }, "getBaseTemplates"), lightTemplates = getBaseTemplates4("light"), darkTemplates = getBaseTemplates4("dark");
  return {
    ...objectFromEntries(objectKeys2(lightTemplates).map((name) => [`light_${name}`, lightTemplates[name]])),
    ...objectFromEntries(objectKeys2(darkTemplates).map((name) => [`dark_${name}`, darkTemplates[name]]))
  };
}, "getTemplates");
var defaultTemplates2 = getTemplates4();
var shadows = {
  light: {
    shadowColor: lightShadowColorStrong,
    shadowColorHover: lightShadowColorStrong,
    shadowColorPress: lightShadowColor,
    shadowColorFocus: lightShadowColor
  },
  dark: {
    shadowColor: darkShadowColorStrong,
    shadowColorHover: darkShadowColorStrong,
    shadowColorPress: darkShadowColor,
    shadowColorFocus: darkShadowColor
  }
};
var nonInherited = {
  light: {
    ...lightColors,
    ...shadows.light
  },
  dark: {
    ...darkColors,
    ...shadows.dark
  }
};
var overlayThemeDefinitions = [{
  parent: "light",
  theme: {
    background: "rgba(0,0,0,0.5)"
  }
}, {
  parent: "dark",
  theme: {
    background: "rgba(0,0,0,0.8)"
  }
}];
var inverseSurface1 = [{
  parent: "active",
  template: "inverseActive"
}, {
  parent: "",
  template: "inverseSurface1"
}];
var surface1 = [{
  parent: "active",
  template: "surfaceActive"
}, {
  parent: "",
  template: "surface1"
}];
var surface2 = [{
  parent: "active",
  template: "surfaceActive"
}, {
  parent: "",
  template: "surface2"
}];
var surface3 = [{
  parent: "active",
  template: "surfaceActive"
}, {
  parent: "",
  template: "surface3"
}];
var defaultComponentThemes2 = {
  ListItem: {
    template: "surface1"
  },
  SelectTrigger: surface1,
  Card: surface1,
  Button: surface3,
  Checkbox: surface2,
  Switch: surface2,
  SwitchThumb: inverseSurface1,
  TooltipContent: surface2,
  Progress: {
    template: "surface1"
  },
  RadioGroupItem: surface2,
  TooltipArrow: {
    template: "surface1"
  },
  SliderTrackActive: {
    template: "surface3"
  },
  SliderTrack: {
    template: "surface1"
  },
  SliderThumb: inverseSurface1,
  Tooltip: inverseSurface1,
  ProgressIndicator: inverseSurface1,
  SheetOverlay: overlayThemeDefinitions,
  DialogOverlay: overlayThemeDefinitions,
  ModalOverlay: overlayThemeDefinitions,
  Input: surface1,
  TextArea: surface1
};
var defaultSubThemes = {
  alt1: {
    template: "alt1"
  },
  alt2: {
    template: "alt2"
  },
  active: {
    template: "surface3"
  },
  surface1: {
    template: "surface1"
  },
  surface2: {
    template: "surface2"
  },
  surface3: {
    template: "surface3"
  },
  surface4: {
    template: "surfaceActive"
  }
};
var themeBuilder = createThemeBuilder().addPalettes(defaultPalettes2).addTemplates(defaultTemplates2).addThemes({
  light: {
    template: "base",
    palette: "light",
    nonInheritedValues: nonInherited.light
  },
  dark: {
    template: "base",
    palette: "dark",
    nonInheritedValues: nonInherited.dark
  }
}).addChildThemes({
  orange: {
    palette: "orange",
    template: "base"
  },
  yellow: {
    palette: "yellow",
    template: "base"
  },
  green: {
    palette: "green",
    template: "base"
  },
  blue: {
    palette: "blue",
    template: "base"
  },
  purple: {
    palette: "purple",
    template: "base"
  },
  pink: {
    palette: "pink",
    template: "base"
  },
  red: {
    palette: "red",
    template: "base"
  },
  gray: {
    palette: "gray",
    template: "base"
  }
}).addChildThemes(defaultSubThemes).addComponentThemes(defaultComponentThemes2, {
  avoidNestingWithin: ["alt1", "alt2", "surface1", "surface2", "surface3", "surface4"]
});
var themesIn = themeBuilder.build();
var themes = themesIn;
var tokens2 = (0, import_web.createTokens)({
  color,
  ...tokens
});

// ../node_modules/@tamagui/constants/dist/esm/constants.mjs
var import_react = require("react");
var isWeb = true;
var isWindowDefined = typeof window < "u";
var isServer = isWeb && !isWindowDefined;
var isClient = isWeb && isWindowDefined;
var useIsomorphicLayoutEffect = isServer ? import_react.useEffect : import_react.useLayoutEffect;
var isChrome = typeof navigator < "u" && /Chrome/.test(navigator.userAgent || "");
var isWebTouchable = isClient && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
var isIos = process.env.TEST_NATIVE_PLATFORM === "ios";

// ../node_modules/@tamagui/use-presence/dist/esm/PresenceContext.mjs
var React = __toESM(require("react"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
var PresenceContext = React.createContext(null);
var ResetPresence = /* @__PURE__ */ __name((props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresenceContext.Provider, {
  value: null,
  children: props.children
}), "ResetPresence");

// ../node_modules/@tamagui/use-presence/dist/esm/usePresence.mjs
var React2 = __toESM(require("react"), 1);
function usePresence() {
  const context = React2.useContext(PresenceContext);
  if (!context) return [true, null, context];
  const {
    id,
    isPresent: isPresent2,
    onExitComplete,
    register
  } = context;
  return React2.useEffect(() => register(id), []), !isPresent2 && onExitComplete ? [false, () => onExitComplete?.(id), context] : [true, void 0, context];
}
__name(usePresence, "usePresence");

// ../node_modules/@tamagui/config/node_modules/@tamagui/animations-css/dist/esm/createAnimations.mjs
var import_web2 = require("@tamagui/core");
var import_react2 = __toESM(require("react"), 1);
function createAnimations(animations) {
  const reactionListeners = /* @__PURE__ */ new WeakMap();
  return {
    animations,
    usePresence,
    ResetPresence,
    supportsCSSVars: true,
    useAnimatedNumber(initial) {
      const [val, setVal] = import_react2.default.useState(initial), [onFinish, setOnFinish] = (0, import_react2.useState)();
      return useIsomorphicLayoutEffect(() => {
        onFinish && (onFinish?.(), setOnFinish(void 0));
      }, [onFinish]), {
        getInstance() {
          return setVal;
        },
        getValue() {
          return val;
        },
        setValue(next, config2, onFinish2) {
          setVal(next), setOnFinish(onFinish2);
        },
        stop() {
        }
      };
    },
    useAnimatedNumberReaction({
      value
    }, onValue) {
      import_react2.default.useEffect(() => {
        const instance = value.getInstance();
        let queue = reactionListeners.get(instance);
        if (!queue) {
          const next = /* @__PURE__ */ new Set();
          reactionListeners.set(instance, next), queue = next;
        }
        return queue.add(onValue), () => {
          queue?.delete(onValue);
        };
      }, []);
    },
    useAnimatedNumberStyle(val, getStyle) {
      return getStyle(val.getValue());
    },
    useAnimations: /* @__PURE__ */ __name(({
      props,
      presence,
      style,
      componentState,
      stateRef
    }) => {
      const isEntering = !!componentState.unmounted, isExiting = presence?.[0] === false, sendExitComplete = presence?.[1], [animationKey, animationConfig] = Array.isArray(props.animation) ? props.animation : [props.animation], animation = animations[animationKey], keys = props.animateOnly ?? ["all"];
      return useIsomorphicLayoutEffect(() => {
        const host = stateRef.current.host;
        if (!sendExitComplete || !isExiting || !host) return;
        const node = host, onFinishAnimation = /* @__PURE__ */ __name(() => {
          sendExitComplete?.();
        }, "onFinishAnimation");
        return node.addEventListener("transitionend", onFinishAnimation), node.addEventListener("transitioncancel", onFinishAnimation), () => {
          node.removeEventListener("transitionend", onFinishAnimation), node.removeEventListener("transitioncancel", onFinishAnimation);
        };
      }, [sendExitComplete, isExiting]), animation && (Array.isArray(style.transform) && (style.transform = (0, import_web2.transformsToString)(style.transform)), style.transition = keys.map((key) => {
        const override = animations[animationConfig?.[key]] ?? animation;
        return `${key} ${override}`;
      }).join(", ")), process.env.NODE_ENV === "development" && props.debug === "verbose" && console.info("CSS animation", {
        props,
        animations,
        animation,
        animationKey,
        style,
        isEntering,
        isExiting
      }), animation ? {
        style,
        className: isEntering ? "t_unmounted" : ""
      } : null;
    }, "useAnimations")
  };
}
__name(createAnimations, "createAnimations");

// ../node_modules/@tamagui/config/dist/esm/animationsCSS.mjs
var smoothBezier = "cubic-bezier(0.215, 0.610, 0.355, 1.000)";
var animationsCSS = createAnimations({
  "75ms": "ease-in 75ms",
  "100ms": "ease-in 100ms",
  "200ms": "ease-in 200ms",
  bouncy: "ease-in 200ms",
  superBouncy: "ease-in 500ms",
  lazy: "ease-in 1000ms",
  medium: "ease-in 300ms",
  slow: "ease-in 500ms",
  quick: `${smoothBezier} 400ms`,
  quicker: `${smoothBezier} 300ms`,
  quickest: `${smoothBezier} 200ms`,
  tooltip: "ease-in 400ms"
});

// ../node_modules/@tamagui/font-inter/dist/esm/index.mjs
var import_core = require("@tamagui/core");
var createInterFont = /* @__PURE__ */ __name((font = {}, {
  sizeLineHeight = /* @__PURE__ */ __name((size3) => size3 + 10, "sizeLineHeight"),
  sizeSize = /* @__PURE__ */ __name((size3) => size3 * 1, "sizeSize")
} = {}) => {
  const size3 = Object.fromEntries(Object.entries({
    ...defaultSizes,
    ...font.size
  }).map(([k, v]) => [k, sizeSize(+v)]));
  return (0, import_core.createFont)({
    family: import_core.isWeb ? 'Inter, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : "Inter",
    lineHeight: Object.fromEntries(Object.entries(size3).map(([k, v]) => [k, sizeLineHeight((0, import_core.getVariableValue)(v))])),
    weight: {
      4: "300"
    },
    letterSpacing: {
      4: 0
    },
    ...font,
    size: size3
  });
}, "createInterFont");
var defaultSizes = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  true: 14,
  5: 16,
  6: 18,
  7: 20,
  8: 23,
  9: 30,
  10: 46,
  11: 55,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 134
};

// ../node_modules/@tamagui/font-silkscreen/dist/esm/index.mjs
var import_core2 = require("@tamagui/core");
var createSilkscreenFont = /* @__PURE__ */ __name((font = {}) => (0, import_core2.createFont)({
  family: import_core2.isWeb ? "Silkscreen, Fira Code, Monaco, Consolas, Ubuntu Mono, monospace" : "Silkscreen",
  size: size2,
  lineHeight: Object.fromEntries(Object.entries(font.size || size2).map(([k, v]) => [k, typeof v == "number" ? Math.round(v * 1.2 + 6) : v])),
  weight: {
    4: "300"
  },
  letterSpacing: {
    4: 1,
    5: 3,
    6: 3,
    9: -2,
    10: -3,
    12: -4
  },
  ...font
}), "createSilkscreenFont");
var size2 = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 16,
  7: 18,
  8: 21,
  9: 28,
  10: 42,
  11: 52,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 124
};

// ../node_modules/@tamagui/config/dist/esm/createGenericFont.mjs
var import_web3 = require("@tamagui/core");
var genericFontSizes = {
  1: 10,
  2: 11,
  3: 12,
  4: 14,
  5: 15,
  6: 16,
  7: 20,
  8: 22,
  9: 30,
  10: 42,
  11: 52,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 124
};
function createGenericFont(family, font = {}, {
  sizeLineHeight = /* @__PURE__ */ __name((val) => val * 1.35, "sizeLineHeight")
} = {}) {
  const size3 = font.size || genericFontSizes;
  return (0, import_web3.createFont)({
    family,
    size: size3,
    lineHeight: Object.fromEntries(Object.entries(size3).map(([k, v]) => [k, sizeLineHeight(+v)])),
    weight: {
      0: "300"
    },
    letterSpacing: {
      4: 0
    },
    ...font
  });
}
__name(createGenericFont, "createGenericFont");

// ../node_modules/@tamagui/config/dist/esm/fonts.mjs
var silkscreenFont = createSilkscreenFont();
var headingFont = createInterFont({
  size: {
    5: 13,
    6: 15,
    9: 32,
    10: 44
  },
  transform: {
    6: "uppercase",
    7: "none"
  },
  weight: {
    6: "400",
    7: "700"
  },
  color: {
    6: "$colorFocus",
    7: "$color"
  },
  letterSpacing: {
    5: 2,
    6: 1,
    7: 0,
    8: 0,
    9: -1,
    10: -1.5,
    12: -2,
    14: -3,
    15: -4
  },
  // for native
  face: {
    700: {
      normal: "InterBold"
    },
    800: {
      normal: "InterBold"
    },
    900: {
      normal: "InterBold"
    }
  }
}, {
  sizeLineHeight: /* @__PURE__ */ __name((size3) => Math.round(size3 * 1.1 + (size3 < 30 ? 10 : 5)), "sizeLineHeight")
});
var bodyFont = createInterFont({
  weight: {
    1: "400",
    7: "600"
  }
}, {
  sizeSize: /* @__PURE__ */ __name((size3) => Math.round(size3), "sizeSize"),
  sizeLineHeight: /* @__PURE__ */ __name((size3) => Math.round(size3 * 1.1 + (size3 >= 12 ? 8 : 4)), "sizeLineHeight")
});
var monoFont = createGenericFont('"ui-monospace", "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', {
  weight: {
    1: "500"
  },
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    5: 16,
    6: 18,
    7: 20,
    8: 22,
    9: 30,
    10: 42,
    11: 52,
    12: 62,
    13: 72,
    14: 92,
    15: 114,
    16: 124
  }
}, {
  sizeLineHeight: /* @__PURE__ */ __name((x) => x * 1.5, "sizeLineHeight")
});
var fonts = {
  heading: headingFont,
  body: bodyFont,
  mono: monoFont,
  silkscreen: silkscreenFont
};

// ../node_modules/@tamagui/config/dist/esm/media.mjs
var media = {
  // for site
  xl: {
    maxWidth: 1650
  },
  lg: {
    maxWidth: 1280
  },
  md: {
    maxWidth: 1020
  },
  sm: {
    maxWidth: 800
  },
  xs: {
    maxWidth: 660
  },
  xxs: {
    maxWidth: 390
  },
  gtXs: {
    minWidth: 661
  },
  gtSm: {
    minWidth: 801
  },
  gtMd: {
    minWidth: 1021
  },
  gtLg: {
    minWidth: 1281
  },
  gtXl: {
    minWidth: 1651
  }
};
var mediaQueryDefaultActive = {
  xl: true,
  lg: true,
  md: true,
  sm: true,
  xs: true,
  // false
  xxs: false
};

// ../node_modules/@tamagui/config/dist/esm/v3.mjs
globalThis.global ||= globalThis;
var selectionStyles = /* @__PURE__ */ __name((theme) => theme.color5 ? {
  backgroundColor: theme.color5,
  color: theme.color11
} : null, "selectionStyles");
var themes2 = process.env.TAMAGUI_OPTIMIZE_THEMES === "true" ? {} : themes;
var config = {
  animations: animationsCSS,
  themes: themes2,
  media,
  shorthands,
  tokens: tokens2,
  fonts,
  selectionStyles,
  settings: {
    mediaQueryDefaultActive,
    defaultFont: "body",
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: true,
    themeClassNameOnRoot: true
  }
};

// ../node_modules/tamagui/dist/esm/createTamagui.mjs
var import_core3 = require("@tamagui/core");
var createTamagui = process.env.NODE_ENV !== "development" ? import_core3.createTamagui : (conf) => {
  const sizeTokenKeys = ["$true"], hasKeys = /* @__PURE__ */ __name((expectedKeys, obj) => expectedKeys.every((k) => typeof obj[k] < "u"), "hasKeys"), tamaguiConfig = (0, import_core3.createTamagui)(conf);
  for (const name of ["size", "space"]) {
    const tokenSet = tamaguiConfig.tokensParsed[name];
    if (!tokenSet) throw new Error(`Expected tokens for "${name}" in ${Object.keys(tamaguiConfig.tokensParsed).join(", ")}`);
    if (!hasKeys(sizeTokenKeys, tokenSet)) throw new Error(`
createTamagui() missing expected tokens.${name}:

Received: ${Object.keys(tokenSet).join(", ")}

Expected: ${sizeTokenKeys.join(", ")}

Tamagui expects a "true" key that is the same value as your default size. This is so 
it can size things up or down from the defaults without assuming which keys you use.

Please define a "true" or "$true" key on your size and space tokens like so (example):

size: {
  sm: 2,
  md: 10,
  true: 10, // this means "md" is your default size
  lg: 20,
}

`);
  }
  const expected = Object.keys(tamaguiConfig.tokensParsed.size);
  for (const name of ["radius", "zIndex"]) {
    const tokenSet = tamaguiConfig.tokensParsed[name], received = Object.keys(tokenSet);
    if (!received.some((rk) => expected.includes(rk))) throw new Error(`
createTamagui() invalid tokens.${name}:

Received: ${received.join(", ")}

Expected a subset of: ${expected.join(", ")}

`);
  }
  return tamaguiConfig;
};

// tamagui.config.ts
var appConfig = createTamagui(config);
var tamagui_config_default = appConfig;
