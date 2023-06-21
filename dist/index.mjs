// src/cssParser.ts
import { readFileSync } from "fs";
import { resolve } from "path";
import postcss from "postcss";
import { globSync } from "glob";
var consoleDisplayName = "[layer-parser]:";
var consoleListJoinString = ",\n	";
var componentList = [];
var utilityList = [];
var missedRules = [];
var processedRules = /* @__PURE__ */ new Set();
var duplicateRules = [];
function log(message) {
  console.log(`${consoleDisplayName} ${message}`);
}
function warn(warning) {
  console.warn(`${consoleDisplayName} ${warning}`);
}
function error(error2) {
  console.error(`${consoleDisplayName} ${error2}`);
}
function fixRuleIndentation(node, config, nesting = 1) {
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
  if (node.selectors != void 0) {
    const rule = node;
    const formattedSelectors = rule.selectors.join(`,
${selectorIndents}`);
    rule.selector = formattedSelectors;
    rule.raws.between = desiredBetween;
  } else if (node.params != void 0) {
    const atRule = node;
    atRule.params = atRule.params.trim();
    atRule.raws.afterName = " ";
    atRule.raws.between = desiredBetween;
  }
  for (const child of node.nodes) {
    child.raws.before = "\n" + innerIndent;
    child.raws.after = "\n" + innerIndent;
    fixRuleIndentation(child, config, nesting + 1);
  }
  return selectorIndents;
}
function adjustRuleRaws(rule, result, config, selectorIndent) {
  rule.raws.before = "\n";
  if (config.commentType !== "None") {
    rule.raws.before += `/* From ${result.opts.from} */
`;
  }
  rule.raws.after = "\n";
}
function hasNotProcessedRule(rule) {
  if (processedRules.has(rule.selector)) {
    duplicateRules.push(rule);
    return false;
  } else {
    processedRules.add(rule.selector);
    return true;
  }
}
function getParser(config) {
  return () => {
    return {
      Rule(rule, { result }) {
        var _a, _b;
        if (((_a = rule.parent) == null ? void 0 : _a.type) == "root") {
          if (hasNotProcessedRule(rule)) {
            if (config.unlayeredClassBehavior == "Ignore") {
              missedRules.push(rule);
              return;
            }
            let selectorIndent = fixRuleIndentation(rule, config);
            adjustRuleRaws(rule, result, config, selectorIndent);
            if (config.unlayeredClassBehavior == "Utility") {
              utilityList.push(rule);
            } else if (config.unlayeredClassBehavior == "Component") {
              componentList.push(rule);
            }
          }
        } else if (((_b = rule.parent) == null ? void 0 : _b.type) == "atrule") {
          if (hasNotProcessedRule(rule)) {
            const atRuleParent = rule.parent;
            if (atRuleParent.params == "components") {
              let selectorIndent = fixRuleIndentation(rule, config);
              adjustRuleRaws(rule, result, config, selectorIndent);
              componentList.push(rule);
            } else if (atRuleParent.params == "utilities") {
              let selectorIndent = fixRuleIndentation(rule, config);
              adjustRuleRaws(rule, result, config, selectorIndent);
              utilityList.push(rule);
            }
          }
        }
      }
    };
  };
}
var cssParser_default = (config) => {
  var _a, _b, _c, _d, _e;
  if (config.globPatterns != void 0 && config.globPatterns.length > 0) {
    for (let pattern of config.globPatterns) {
      if (pattern.startsWith("/**")) {
        error(`User attempted to glob their entire computer using: ${pattern}. This would result in a serious performance problem, and thus parsing has been skipped.`);
        return {
          components: [],
          utilities: []
        };
      }
    }
  }
  (_a = config.commentType) != null ? _a : config.commentType = "File";
  (_b = config.openBracketNewLine) != null ? _b : config.openBracketNewLine = false;
  (_c = config.debug) != null ? _c : config.debug = false;
  (_d = config.unlayeredClassBehavior) != null ? _d : config.unlayeredClassBehavior = "Utility";
  (_e = config.globPatterns) != null ? _e : config.globPatterns = ["**/*.css"];
  if (config.directory == void 0) {
    warn("There was no directory provided. Defaulting to process.cwd().");
    config.directory = process.cwd();
  }
  const resolvedDirectory = resolve(config.directory);
  let result = [];
  result = globSync(config.globPatterns, {
    cwd: resolvedDirectory
  });
  log(`Searched directory: ${resolvedDirectory}`);
  if (config.debug) {
    log(`Found: ${result.join("	")}`);
  }
  const cssParser = {
    postcssPlugin: "layer-parser",
    prepare: getParser(config)
  };
  const invalidFiles = [];
  const processor = postcss([cssParser]);
  let parseFile;
  switch (config.commentType) {
    case "Absolute":
      parseFile = (fileName, fullPath) => {
        const file = readFileSync(fullPath, "utf8");
        processor.process(file, { from: fullPath, to: fullPath }).then((result2) => {
        });
      };
      break;
    default:
      parseFile = (fileName, fullPath) => {
        const file = readFileSync(fullPath, "utf8");
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
    const fullPath = resolve(resolvedDirectory, fileName);
    parseFile(fileName, fullPath);
  }
  if (invalidFiles.length > 0) {
    warn(`Globbing resulted in files that did not end in .css:
	${invalidFiles.join(consoleListJoinString)}`);
  }
  if (missedRules.length > 0) {
    let warnMessage = `The target directory: ${config.directory} had ${missedRules.length} unlayered css rules not parsed:`;
    if (config.debug) {
      warnMessage += `
	${missedRules.map((rule) => rule.selector.replace("\n", "")).join(consoleListJoinString)}`;
    }
    warn(warnMessage);
  }
  if (duplicateRules.length > 0) {
    let warnMessage = `The target directory: ${config.directory} had ${duplicateRules.length} rules with selectors that were already used (two styles for the same elements). Note, this only discovers duplicates in the TOP level of a layer or document, NOT nested styles.`;
    if (config.debug) {
      warnMessage += `
	${duplicateRules.map((rule) => rule.selector.replace("\n", "")).join(consoleListJoinString)}`;
    }
    warn(warnMessage);
  }
  return {
    utilities: utilityList,
    components: componentList
  };
};

// src/index.ts
function ParseCSSDirectoryPlugin(config) {
  return ({ addUtilities, addComponents }) => {
    const classes = cssParser_default(config);
    for (const utility of classes.utilities) {
      addUtilities(utility);
    }
    for (const component of classes.components) {
      addComponents(component);
    }
  };
}
export {
  ParseCSSDirectoryPlugin,
  cssParser_default as cssParser
};
