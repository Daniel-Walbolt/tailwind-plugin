var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  MatchedUtility: () => MatchedUtility,
  ParseCSS: () => ParseCSS,
  cssParser: () => CSSParser,
  resetData: () => resetData2
});
module.exports = __toCommonJS(src_exports);

// src/util/nodeConverter.ts
function convertDeclartion(declaration, formattedObject = {}) {
  if (declaration.type === "decl") {
    formattedObject[declaration.prop] = declaration.value;
  }
  return formattedObject;
}
function convertRule(rule, formattedObject = {}, includeRuleSelector = true) {
  if (rule.type === "rule") {
    let convertedRule = {};
    for (const node of rule.nodes) {
      if (node.type === "decl") {
        convertedRule = convertDeclartion(node, convertedRule);
      } else if (node.type === "rule") {
        convertedRule = convertRule(node, convertedRule);
      } else if (node.type === "atrule") {
        convertedRule = convertAtRule(node, convertedRule);
      }
    }
    if (includeRuleSelector) {
      formattedObject[rule.selector] = convertedRule;
    } else {
      return convertedRule;
    }
    return formattedObject;
  }
}
function convertAtRule(atRule, formattedObject = {}) {
  if (atRule.type === "atrule") {
    let convertedAtRule = {};
    for (const node of atRule.nodes) {
      if (node.type === "decl") {
        convertedAtRule = convertDeclartion(node, convertedAtRule);
      } else if (node.type === "rule") {
        convertedAtRule = convertRule(node, convertedAtRule);
      } else if (node.type === "atrule") {
        convertedAtRule = convertAtRule(node, convertedAtRule);
      }
    }
    formattedObject[`@${atRule.name} ${atRule.params}`] = convertedAtRule;
    return formattedObject;
  }
}

// src/util/animationParser.ts
var DIRECTIONS = /* @__PURE__ */ new Set(["normal", "reverse", "alternate", "alternate-reverse"]);
var PLAY_STATES = /* @__PURE__ */ new Set(["running", "paused"]);
var FILL_MODES = /* @__PURE__ */ new Set(["none", "forwards", "backwards", "both"]);
var ITERATION_COUNTS = /* @__PURE__ */ new Set(["infinite"]);
var TIMINGS = /* @__PURE__ */ new Set(["linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"]);
var TIMING_FNS = ["cubic-bezier", "steps"];
var COMMA = /\,(?![^(]*\))/g;
var SPACE = /\ +(?![^(]*\))/g;
var TIME = /^(-?[\d.]+m?s)$/;
var DIGIT = /^(\d+)$/;
function parseAnimationValue(input) {
  let animations = input.split(COMMA);
  return animations.map((animation) => {
    var _a;
    let value = animation.trim();
    let result = { value };
    let parts = value.split(SPACE);
    let seen = /* @__PURE__ */ new Set();
    for (let part of parts) {
      if (!seen.has("DIRECTIONS") && DIRECTIONS.has(part)) {
        result.direction = part;
        seen.add("DIRECTIONS");
      } else if (!seen.has("PLAY_STATES") && PLAY_STATES.has(part)) {
        result.playState = part;
        seen.add("PLAY_STATES");
      } else if (!seen.has("FILL_MODES") && FILL_MODES.has(part)) {
        result.fillMode = part;
        seen.add("FILL_MODES");
      } else if (!seen.has("ITERATION_COUNTS") && (ITERATION_COUNTS.has(part) || DIGIT.test(part))) {
        result.iterationCount = part;
        seen.add("ITERATION_COUNTS");
      } else if (!seen.has("TIMING_FUNCTION") && TIMINGS.has(part)) {
        result.timingFunction = part;
        seen.add("TIMING_FUNCTION");
      } else if (!seen.has("TIMING_FUNCTION") && TIMING_FNS.some((f) => part.startsWith(`${f}(`))) {
        result.timingFunction = part;
        seen.add("TIMING_FUNCTION");
      } else if (!seen.has("DURATION") && TIME.test(part)) {
        result.duration = part;
        seen.add("DURATION");
      } else if (!seen.has("DELAY") && TIME.test(part)) {
        result.delay = part;
        seen.add("DELAY");
      } else if (!seen.has("NAME")) {
        result.name = part;
        seen.add("NAME");
      } else {
        (_a = result.unknown) != null ? _a : result.unknown = [];
        result.unknown.push(part);
      }
    }
    return result;
  });
}

// src/util/keyframes.ts
var keyframes = /* @__PURE__ */ new Map();
var animationRuleQueue = /* @__PURE__ */ new Map();
function resetData() {
  keyframes.clear();
  animationRuleQueue.clear();
}
function attemptToProcessKeyframe(atRule, result, config) {
  if (atRule.name = "keyframes") {
    if (atRule.parent.type == "rule") {
      return false;
    }
    let atRuleIdentifier = getIdentifier(atRule);
    keyframes.set(atRuleIdentifier, atRule);
    return true;
  }
  return false;
}
function matchKeyframesToRules(matchedKeyframes2, components2, utilities2, missedKeyframes2, config) {
  var _a;
  for (const [ruleIdentifier, ruleAndKeyframes] of animationRuleQueue.entries()) {
    const rule = ruleAndKeyframes.rule;
    components2.delete(ruleIdentifier);
    utilities2.delete(ruleIdentifier);
    const jsonStringifiedUtility = convertRule(rule, {}, false);
    let intellisensePrefix = config.animationPrefix;
    const matchedKeyframe = new MatchedUtility({
      node: rule,
      stringifiedNode: jsonStringifiedUtility
    }, intellisensePrefix);
    for (const keyframeIdentifier of ruleAndKeyframes.keyframes) {
      let keyframe = keyframes.get(keyframeIdentifier);
      if (keyframe == void 0) {
        let missedKeyframeSet = (_a = missedKeyframes2.get(keyframeIdentifier)) != null ? _a : /* @__PURE__ */ new Set();
        if (!missedKeyframeSet.has(rule.selector)) {
          missedKeyframeSet.add(rule.selector);
        }
        continue;
      }
      const jsonStringifiedMatch = convertAtRule(keyframe);
      matchedKeyframe.content.push({
        node: keyframe,
        stringifiedNode: jsonStringifiedMatch
      });
    }
    matchedKeyframes2.set(ruleIdentifier, matchedKeyframe);
  }
}
function registerAnimationDeclaration(declaration, topParentRule) {
  var _a, _b;
  if (declaration.prop == "animation") {
    const ruleIdentifier = getIdentifier(topParentRule);
    const parseResult = parseAnimationValue(declaration.value);
    let addedAnimation = false;
    for (let parsedAnimationValue of parseResult) {
      const animationName = parsedAnimationValue.name;
      if (animationName == void 0) {
        continue;
      }
      const ruleAndKeyframes = (_a = animationRuleQueue.get(ruleIdentifier)) != null ? _a : { rule: topParentRule, keyframes: /* @__PURE__ */ new Set() };
      if (!ruleAndKeyframes.keyframes.has(animationName)) {
        ruleAndKeyframes.keyframes.add(`@keyframes ${animationName}`);
      }
      animationRuleQueue.set(ruleIdentifier, ruleAndKeyframes);
      addedAnimation = true;
    }
    return addedAnimation;
  } else if (declaration.prop == "animation-name") {
    const ruleIdentifier = getIdentifier(topParentRule);
    const ruleAndKeyframes = (_b = animationRuleQueue.get(ruleIdentifier)) != null ? _b : { rule: topParentRule, keyframes: /* @__PURE__ */ new Set() };
    if (!ruleAndKeyframes.keyframes.has(declaration.value)) {
      ruleAndKeyframes.keyframes.add(`@keyframes ${declaration.value}`);
    }
    animationRuleQueue.set(ruleIdentifier, ruleAndKeyframes);
    return true;
  }
  return false;
}

// src/util/nodeFormatter.ts
function getIdentifier(node) {
  let ruleIdentifier = "";
  if (node.type == "rule") {
    node = node;
    ruleIdentifier = node.selector;
  } else if (node.type == "atrule") {
    node = node;
    ruleIdentifier = `@${node.name} ${node.params}`;
  }
  return ruleIdentifier;
}
function formatNode(node, config, result, originalParentRule, nesting = 1) {
  if (node.nodes == void 0 || node.nodes.length == 0) {
    return;
  }
  let innerIndent = "";
  let selectorIndents = "";
  for (let i = 0; i < nesting; i++) {
    innerIndent += "	";
    if (i < nesting - 1) {
      selectorIndents += "	";
    }
  }
  let desiredBetween = config.openBracketNewLine ? `
${selectorIndents}` : " ";
  if (node.type === "rule") {
    const rule = node;
    const formattedSelectors = rule.selectors.join(`,
${selectorIndents}`);
    rule.selector = formattedSelectors;
    rule.raws.between = desiredBetween;
  } else if (node.type == "atrule") {
    const atRule = node;
    atRule.params = atRule.params.trim();
    atRule.raws.afterName = " ";
    atRule.raws.between = desiredBetween;
  }
  for (const child of node.nodes) {
    if (child.type == "decl") {
      if (originalParentRule.type == "rule") {
        registerAnimationDeclaration(child, originalParentRule);
      }
    }
    child.raws.before = "\n" + innerIndent;
    child.raws.after = "\n" + innerIndent;
    formatNode(child, config, result, originalParentRule, nesting + 1);
  }
  if (nesting == 1) {
    node.raws.before = "\n";
    if (config.commentType !== "None") {
      node.raws.before += `/* From ${result.opts.from} */
`;
    }
    node.raws.after = "\n";
  }
}

// src/types.ts
var MatchedUtility = class {
  constructor(rule, intellisenseValue) {
    this.content = [];
    this.rule = rule;
    this.intellisensePrefix = intellisenseValue;
  }
  /** 
   * Provides all the content for tailwind to process. Defines the suffix used in intellisense and provides the CSS styles.	
   */
  getMatchedContent() {
    let matcher = {};
    let stringifiedMatches = this.content.map((x) => x.stringifiedNode);
    let contentObject = Object.fromEntries(stringifiedMatches.entries());
    matcher[this.intellisensePrefix] = (value) => {
      return [
        contentObject,
        this.rule.stringifiedNode
      ];
    };
    return matcher;
  }
  /** Provides the suffixes that CAN be used with the prefix.
   * These suffixes can provide values that can manipulate the stylings, but this plugin doesn't support those yet.
   * ```
   * .{prefix}-{suffix}
   * ```
  */
  getMatchedValues() {
    let suffixes = {};
    let identifier = getIdentifier(this.rule.node).match(/\w+/g).join("-");
    suffixes[identifier] = "";
    return {
      values: suffixes
    };
  }
};

// src/cssParser.ts
var import_fs = require("fs");
var import_path = require("path");
var import_postcss = __toESM(require("postcss"));

// src/util/logger.ts
var consoleMessagePrefix = "[layer-parser]:";
function consoleListJoinString(nested = 1) {
  let separator = "\n";
  for (let i = 0; i < nested; i++) {
    separator += "	";
  }
  separator += "- ";
  return separator;
}
function log(message) {
  console.log(`${consoleMessagePrefix} ${message}`);
}
function warn(warning) {
  console.warn(`${consoleMessagePrefix} ${warning}`);
}
function error(error2) {
  console.error(`${consoleMessagePrefix} ${error2}`);
}

// src/cssParser.ts
var import_glob = require("glob");
var components = /* @__PURE__ */ new Map();
var utilities = /* @__PURE__ */ new Map();
var matchedKeyframes = /* @__PURE__ */ new Map();
var duplicateRules = /* @__PURE__ */ new Map();
var missedRules = /* @__PURE__ */ new Map();
var missedKeyframes = /* @__PURE__ */ new Map();
function hasNotProcessedRule(node, result) {
  let ruleIdentifier = getIdentifier(node);
  if (utilities.has(ruleIdentifier) || components.has(ruleIdentifier)) {
    let nodeStatistic = duplicateRules.get(ruleIdentifier);
    if (nodeStatistic) {
      let nodeFileCount = nodeStatistic == null ? void 0 : nodeStatistic.get(result.opts.from);
      if (nodeFileCount) {
        nodeStatistic.set(result.opts.from, nodeFileCount + 1);
      } else {
        nodeStatistic.set(result.opts.from, 1);
      }
    } else {
      duplicateRules.set(ruleIdentifier, /* @__PURE__ */ new Map([[result.opts.from, 1]]));
    }
    return false;
  }
  return true;
}
function processRule(rule, result, config) {
  var _a, _b, _c;
  let ruleIdentifier = getIdentifier(rule);
  if (((_a = rule.parent) == null ? void 0 : _a.type) === "root") {
    if (hasNotProcessedRule(rule, result)) {
      if (config.unlayeredClassBehavior === "Ignore") {
        let files = (_b = missedRules.get(ruleIdentifier)) != null ? _b : /* @__PURE__ */ new Set();
        files.add(result.opts.from);
        missedRules.set(ruleIdentifier, files);
        return;
      }
      formatNode(rule, config, result, rule);
      if (config.unlayeredClassBehavior === "Utility") {
        utilities.set(ruleIdentifier, rule);
      } else if (config.unlayeredClassBehavior === "Component") {
        components.set(ruleIdentifier, rule);
      }
    }
  } else if (((_c = rule.parent) == null ? void 0 : _c.type) == "atrule") {
    if (hasNotProcessedRule(rule, result)) {
      const atRuleParent = rule.parent;
      if (atRuleParent.params === "components") {
        formatNode(rule, config, result, rule);
        components.set(ruleIdentifier, rule);
      } else if (atRuleParent.params === "utilities") {
        formatNode(rule, config, result, rule);
        utilities.set(ruleIdentifier, rule);
      }
    }
  }
}
function processAtRule(atRule, result, config) {
  attemptToProcessKeyframe(atRule, result, config);
}
function getParser(config) {
  return () => {
    return {
      Rule(rule, { result }) {
        processRule(rule, result, config);
      },
      AtRule: {
        keyframes: (atRule, { result }) => {
          processAtRule(atRule, result, config);
        }
      }
    };
  };
}
function verifyConfiguration(config) {
  var _a, _b, _c, _d, _e;
  const verifyBoolean = (bool) => bool !== true && bool !== false;
  if (config.directory == void 0) {
    warn("There was no directory provided. Defaulting to process.cwd().");
    config.directory = process.cwd();
  }
  (_a = config.commentType) != null ? _a : config.commentType = "File";
  if (config.commentType !== "File" && config.commentType != "Absolute" && config.commentType != "None") {
    warn("Invalid configuration for commentType. Defaulting to 'File'");
    config.commentType = "File";
  }
  (_b = config.openBracketNewLine) != null ? _b : config.openBracketNewLine = false;
  if (verifyBoolean(config.openBracketNewLine)) {
    warn("Invalid configuration for openBracketNewLine. Defaulting to false");
    config.openBracketNewLine = false;
  }
  (_c = config.debug) != null ? _c : config.debug = false;
  if (verifyBoolean(config.debug)) {
    warn("Invalid configuration for debug. Defaulting to false.");
    config.debug = false;
  }
  (_d = config.unlayeredClassBehavior) != null ? _d : config.unlayeredClassBehavior = "Utility";
  if (config.unlayeredClassBehavior !== "Utility" && config.unlayeredClassBehavior !== "Component" && config.unlayeredClassBehavior !== "Ignore") {
    warn("Invalid configuration for unlayedClassBehavior. Defaulting to Utility");
    config.unlayeredClassBehavior = "Utility";
  }
  (_e = config.globPatterns) != null ? _e : config.globPatterns = ["**/*.css"];
  if (config.animationPrefix == void 0 || config.animationPrefix.trim().length == 0) {
    config.animationPrefix = "animate";
  }
}
function resetData2() {
  if (components.size == 0 && utilities.size == 0) {
    log("Reset parsed components and utilities.");
  }
  components.clear();
  utilities.clear();
  matchedKeyframes.clear();
  resetData();
}
function CSSParser(config) {
  if (config.globPatterns != void 0 && config.globPatterns.length > 0) {
    for (let pattern of config.globPatterns) {
      if (pattern.startsWith("/**")) {
        error(`User attempted to glob their entire computer using: ${pattern}. This would result in a serious performance problem, and thus parsing has been skipped.`);
        return {
          components: [],
          utilities: [],
          keyframeUtilities: []
        };
      }
    }
  }
  verifyConfiguration(config);
  duplicateRules.clear();
  missedRules.clear();
  missedKeyframes.clear();
  const resolvedDirectory = (0, import_path.resolve)(config.directory);
  let result = [];
  result = (0, import_glob.globSync)(config.globPatterns, {
    cwd: resolvedDirectory
  });
  if (config.debug) {
    log(`Searched directories: ${resolvedDirectory}`);
    log(`Found: ${result.join("	")}`);
  }
  const cssParser = {
    postcssPlugin: "layer-parser",
    prepare: getParser(config)
  };
  const invalidFiles = [];
  const processor = (0, import_postcss.default)([cssParser]);
  let parseFile;
  switch (config.commentType) {
    case "Absolute":
      parseFile = (fileName, fullPath) => {
        const file = (0, import_fs.readFileSync)(fullPath, "utf8");
        processor.process(file, { from: fullPath, to: fullPath }).then((result2) => {
        });
      };
      break;
    default:
      parseFile = (fileName, fullPath) => {
        const file = (0, import_fs.readFileSync)(fullPath, "utf8");
        processor.process(file, { from: fileName, to: fileName }).then((result2) => {
        });
      };
      break;
  }
  for (const fileName of result) {
    if (!fileName.endsWith(".css")) {
      invalidFiles.push(fileName);
      continue;
    }
    const fullPath = (0, import_path.resolve)(resolvedDirectory, fileName);
    parseFile(fileName, fullPath);
  }
  if (invalidFiles.length > 0) {
    warn(`Globbing resulted in files that did not end in .css:
	${invalidFiles.join(consoleListJoinString())}`);
  }
  if (missedRules.size > 0) {
    let warnMessage = `The target directory: ${config.directory} had ${missedRules.size} unlayered css rules not parsed:`;
    if (config.debug) {
      for (let [selector, location] of missedRules) {
        warnMessage += `
	${selector}`;
        warnMessage += "\n		- ";
        warnMessage += Array.from(location.values()).join(consoleListJoinString(2));
      }
    }
    warn(warnMessage);
  }
  if (duplicateRules.size > 0) {
    let debugMessage = "";
    let duplicateRuleCount = 0;
    for (let [selector, stat] of duplicateRules) {
      debugMessage += `
	${selector}`;
      for (let [file, count] of stat) {
        debugMessage += `${consoleListJoinString(2)}${file} - ${count}`;
        duplicateRuleCount += count;
      }
    }
    let warnMessage = `Found ${duplicateRuleCount} rules with selectors that were already used. Note, this only discovers root-level (not nested) duplicates that would be added based on the configuration.`;
    if (config.debug) {
      warnMessage += debugMessage;
    }
    warn(warnMessage);
  }
  matchKeyframesToRules(matchedKeyframes, components, utilities, missedKeyframes, config);
  if (missedKeyframes.size > 0) {
    let debugMessage = "";
    let missedKeyframeCount = 0;
    for (let [keyframeIdentifier, ruleSelectors] of missedKeyframes) {
      debugMessage += `
	${keyframeIdentifier}`;
      missedKeyframeCount += ruleSelectors.size;
      for (let rule of ruleSelectors) {
        debugMessage += `${consoleListJoinString(2)}${rule}`;
      }
    }
    let warnMessage = `Could not find ${missedKeyframeCount} keyframes that were referenced by the searched CSS files.`;
    if (config.debug) {
      warnMessage += debugMessage;
    }
    warn(warnMessage);
  }
  return {
    utilities: Array.from(utilities.values()),
    components: Array.from(components.values()),
    keyframeUtilities: Array.from(matchedKeyframes.values())
  };
}

// src/index.ts
function ParseCSS(config) {
  return ({ addUtilities, addComponents, matchUtilities }) => {
    resetData2();
    const classes = CSSParser(config);
    for (const utility of classes.utilities) {
      addUtilities(utility);
    }
    for (const component of classes.components) {
      addComponents(component);
    }
    for (const matchedKeyframe of classes.keyframeUtilities) {
      matchUtilities(
        matchedKeyframe.getMatchedContent(),
        matchedKeyframe.getMatchedValues()
      );
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MatchedUtility,
  ParseCSS,
  cssParser,
  resetData
});
