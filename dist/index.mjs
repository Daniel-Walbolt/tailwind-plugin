// src/cssParser.ts
import { readFileSync } from "fs";
import { resolve } from "path";
import postcss from "postcss";
import { globSync } from "glob";
var consoleDisplayName = "[layer-parser]:";
var componentList = [];
var utilityList = [];
var missedRules = [];
var processedRules = /* @__PURE__ */ new Set();
var duplicateRules = [];
function log(message) {
  console.log(`${consoleMessagePrefix} ${message}`);
}
function warn(warning) {
  console.warn(`${consoleMessagePrefix} ${warning}`);
}
function error(error2) {
  console.error(`${consoleMessagePrefix} ${error2}`);
}
function adjustNodeRaws(node, config, result, nesting = 1) {
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
  let desiredBetween = config.openBracketNewLine
    ? `
${selectorIndents}`
    : " ";
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
    child.raws.before = "\n" + innerIndent;
    child.raws.after = "\n" + innerIndent;
    adjustNodeRaws(child, config, result, nesting + 1);
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
function hasNotProcessedRule(rule, result) {
  let ruleIdentifier = getIdentifier(rule);
  if (utilities.has(ruleIdentifier) || components.has(ruleIdentifier)) {
    let nodeStatistic = duplicateRules.get(ruleIdentifier);
    if (nodeStatistic) {
      let nodeFileCount =
        nodeStatistic == null ? void 0 : nodeStatistic.get(result.opts.from);
      if (nodeFileCount) {
        nodeStatistic.set(result.opts.from, nodeFileCount + 1);
      } else {
        nodeStatistic.set(result.opts.from, 1);
      }
    } else {
      duplicateRules.set(
        ruleIdentifier,
        /* @__PURE__ */ new Map([[result.opts.from, 1]])
      );
    }
    return false;
  }
  return true;
}
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
function processRule(rule, result, config) {
  var _a, _b, _c;
  let ruleIdentifier = getIdentifier(rule);
  if (((_a = rule.parent) == null ? void 0 : _a.type) === "root") {
    if (hasNotProcessedRule(rule, result)) {
      if (config.unlayeredClassBehavior === "Ignore") {
        let files =
          (_b = missedRules.get(ruleIdentifier)) != null
            ? _b
            : /* @__PURE__ */ new Set();
        files.add(result.opts.from);
        missedRules.set(ruleIdentifier, files);
        return;
      }
      if (config.unlayeredClassBehavior === "Utility") {
        adjustNodeRaws(rule, config, result);
        utilities.set(ruleIdentifier, rule);
      } else if (config.unlayeredClassBehavior === "Component") {
        adjustNodeRaws(rule, config, result);
        components.set(ruleIdentifier, rule);
      }
    }
  } else if (((_c = rule.parent) == null ? void 0 : _c.type) == "atrule") {
    if (hasNotProcessedRule(rule, result)) {
      const atRuleParent = rule.parent;
      if (atRuleParent.params === "components") {
        adjustNodeRaws(rule, config, result);
        components.set(ruleIdentifier, rule);
      } else if (atRuleParent.params === "utilities") {
        adjustNodeRaws(rule, config, result);
        utilities.set(ruleIdentifier, rule);
      }
    }
  }
}
function processAtRule(atRule, result, config) {
  let ruleIdentifier = getIdentifier(atRule);
  keyframes.set(ruleIdentifier, atRule);
}
function getTopRule(node, config) {
  let nextParent = node.parent;
  let parent = node;
  let isTopParent = false;
  while (!isTopParent && nextParent != null) {
    if (nextParent.type === "root") {
      if (parent.type == "rule") {
        if (config.unlayeredClassBehavior == "Ignore") {
          return null;
        }
        isTopParent = true;
        continue;
      }
    } else if (nextParent.type === "atrule") {
      const atRuleParent = nextParent;
      if (atRuleParent.name !== "layer") {
        continue;
      }
      if (
        atRuleParent.params === "components" ||
        atRuleParent.params === "utilities"
      ) {
        isTopParent = true;
        continue;
      }
    }
    parent = nextParent;
    nextParent = nextParent.parent;
  }
  log("Found parent " + parent.toString());
  return parent;
}
function getParser(config) {
  return () => {
    return {
      Rule(rule, { result }) {
        processRule(rule, result, config);
      },
      AtRule: {
        media: (atRule, { result }) => {
          processAtRule(atRule, result, config);
        },
        keyframes: (atRule, { result }) => {
          processAtRule(atRule, result, config);
        },
      },
      Declaration: {
        "animation-name": (declaration, { result }) => {
          var _a;
          const topParent = getTopRule(declaration, config);
          if (topParent != null && topParent.type == "rule") {
            const identifier = getIdentifier(topParent);
            const set =
              (_a = neededKeyFrames.get(declaration.value)) != null
                ? _a
                : /* @__PURE__ */ new Set();
            set.add(identifier);
            neededKeyFrames.set(`@keyframes ${declaration.value}`, set);
          }
        },
      },
    };
  };
}
function assignKeyframesToRules() {
  log("Assigning keyframes to rules");
  for (const [
    keyframeIdentifier,
    ruleIdentifiers,
  ] of neededKeyFrames.entries()) {
    log("Keyframe: " + keyframeIdentifier + " being added to");
    let keyframe = keyframes.get(keyframeIdentifier);
    if (keyframe == null) {
      continue;
    }
    for (let ruleIdentifier of ruleIdentifiers) {
      log("Rule identifier: " + ruleIdentifier);
      const targetMap = components.has(ruleIdentifier)
        ? components
        : utilities.has(ruleIdentifier)
        ? utilities
        : void 0;
      if (targetMap == void 0) {
        continue;
      }
      let rule = targetMap.get(ruleIdentifier);
      if (rule == null) {
        continue;
      }
      log(ruleIdentifier + " nodes " + rule.nodes.length);
      rule.nodes = [keyframe, ...rule.nodes];
      targetMap.set(ruleIdentifier, rule);
      log(ruleIdentifier + " nodes " + rule.nodes.length);
    }
  }
}
function verifyConfiguration(config) {
  var _a, _b, _c, _d, _e;
  const verifyBoolean = (bool) => bool !== true && bool !== false;
  if (config.directory == void 0) {
    warn("There was no directory provided. Defaulting to process.cwd().");
    config.directory = process.cwd();
  }
  (_a = config.commentType) != null ? _a : (config.commentType = "File");
  if (
    config.commentType !== "File" &&
    config.commentType != "Absolute" &&
    config.commentType != "None"
  ) {
    warn("Invalid configuration for commentType. Defaulting to 'File'");
    config.commentType = "File";
  }
  (_b = config.openBracketNewLine) != null
    ? _b
    : (config.openBracketNewLine = false);
  if (verifyBoolean(config.openBracketNewLine)) {
    warn("Invalid configuration for openBracketNewLine. Defaulting to false");
    config.openBracketNewLine = false;
  }
  (_c = config.debug) != null ? _c : (config.debug = false);
  if (verifyBoolean(config.debug)) {
    warn("Invalid configuration for debug. Defaulting to false.");
    config.debug = false;
  }
  (_d = config.unlayeredClassBehavior) != null
    ? _d
    : (config.unlayeredClassBehavior = "Utility");
  if (
    config.unlayeredClassBehavior !== "Utility" &&
    config.unlayeredClassBehavior !== "Component" &&
    config.unlayeredClassBehavior !== "Ignore"
  ) {
    warn(
      "Invalid configuration for unlayedClassBehavior. Defaulting to Utility"
    );
    config.unlayeredClassBehavior = "Utility";
  }
  (_e = config.globPatterns) != null
    ? _e
    : (config.globPatterns = ["**/*.css"]);
}
function resetData() {
  if (components.size == 0 && utilities.size == 0) {
    log("Reset parsed components and utilities.");
  }
  components.clear();
  utilities.clear();
}
function cssParser(config) {
  if (config.globPatterns != void 0 && config.globPatterns.length > 0) {
    for (let pattern of config.globPatterns) {
      if (pattern.startsWith("/**")) {
        error(
          `User attempted to glob their entire computer using: ${pattern}. This would result in a serious performance problem, and thus parsing has been skipped.`
        );
        return {
          components: [],
          utilities: [],
        };
      }
    }
  }
  verifyConfiguration(config);
  duplicateRules.clear();
  missedRules.clear();
  const resolvedDirectory = resolve(config.directory);
  let result = [];
  result = globSync(config.globPatterns, {
    cwd: resolvedDirectory,
  });
  log(`Searched directory: ${resolvedDirectory}`);
  if (config.debug) {
    log(`Found: ${result.join("	")}`);
  }
  const cssParser2 = {
    postcssPlugin: "layer-parser",
    prepare: getParser(config),
  };
  const invalidFiles = [];
  const processor = postcss([cssParser2]);
  let parseFile;
  switch (config.commentType) {
    case "Absolute":
      parseFile = (fileName, fullPath) => {
        const file = readFileSync(fullPath, "utf8");
        processor
          .process(file, { from: fullPath, to: fullPath })
          .then((result2) => {});
      };
      break;
    default:
      parseFile = (fileName, fullPath) => {
        const file = readFileSync(fullPath, "utf8");
        processor
          .process(file, { from: fileName, to: fileName })
          .then((result2) => {});
      };
      break;
  }
  for (const fileName of result) {
    if (!fileName.endsWith(".css")) {
      invalidFiles.push(fileName);
      continue;
    }
    const fullPath = resolve(resolvedDirectory, fileName);
    parseFile(fileName, fullPath);
  }
  if (invalidFiles.length > 0) {
    warn(`Globbing resulted in files that did not end in .css:
	${invalidFiles.join("\n	")}`);
  }
  if (missedRules.length > 0) {
    let warnMessage = `The target directory: ${config.directory} had ${missedRules.length} unlayed css rules not parsed:`;
    if (config.debug) {
      warnMessage += `
	${missedRules.map((rule) => rule.selector).join(",\n	")}`;
    }
    warn(warnMessage);
  }
  if (duplicateRules.length > 0) {
    const duplicateSelectors = duplicateRules.map((rule) => rule.selector);
    warn(`There were duplicate rules found:
	${duplicateSelectors.join("\n	")}`);
  }
  assignKeyframesToRules();
  return {
    utilities: Array.from(utilities.values()),
    components: Array.from(components.values()),
  };
}

// src/index.ts
function ParseDirectory(config) {
  return ({ addUtilities, addComponents, matchUtilities }) => {
    resetData();
    const classes = cssParser(config);
    for (const utility of classes.utilities) {
      addUtilities(utility);
    }
    for (const component of classes.components) {
      addComponents(component);
    }
    addUtilities({
      "keyframes test-animation": {
        "50%": {
          "background-color": "red",
        },
      },
      "test-animation": {
        animation: "test-animation 1s ease infinite",
      },
    });
  };
}
export { ParseDirectory, cssParser, resetData };
