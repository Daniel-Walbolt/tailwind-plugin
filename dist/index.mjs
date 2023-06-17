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
  console.log(`${consoleDisplayName} ${message}`);
}
function warn(warning) {
  console.warn(`${consoleDisplayName} ${warning}`);
}
function error(error2) {
  console.error(`${consoleDisplayName} ${error2}`);
}
function fixRuleIndentation(node, nesting = 1) {
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
  if (node.selectors != void 0) {
    const rule = node;
    const formattedSelectors = rule.selectors.join(`,
${selectorIndents}`);
    rule.selector = formattedSelectors;
    rule.raws.between = " ";
  } else if (node.params != void 0) {
    const atRule = node;
    atRule.params = atRule.params.trim();
    atRule.raws.afterName = " ";
    atRule.raws.between = " ";
  }
  for (const child of node.nodes) {
    child.raws.before = "\n" + innerIndent;
    child.raws.after = "\n" + innerIndent;
    fixRuleIndentation(child, nesting + 1);
  }
}
function adjustRuleRaws(rule, result) {
  rule.raws.before = `
/* From ${result.opts.from} */
`;
  rule.raws.between = " ";
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
            if (config.addClassesWithoutLayerAsUtilities == void 0) {
              missedRules.push(rule);
              return;
            }
            fixRuleIndentation(rule);
            adjustRuleRaws(rule, result);
            if (config.addClassesWithoutLayerAsUtilities == true) {
              utilityList.push(rule);
            } else if (config.addClassesWithoutLayerAsUtilities == false) {
              componentList.push(rule);
            }
          }
        } else if (((_b = rule.parent) == null ? void 0 : _b.type) == "atrule") {
          if (hasNotProcessedRule(rule)) {
            const atRuleParent = rule.parent;
            if (atRuleParent.params == "components") {
              fixRuleIndentation(rule);
              adjustRuleRaws(rule, result);
              componentList.push(rule);
            } else if (atRuleParent.params == "utilities") {
              fixRuleIndentation(rule);
              adjustRuleRaws(rule, result);
              utilityList.push(rule);
            }
          }
        }
      }
    };
  };
}
var cssParser_default = (config) => {
  var _a;
  if (config.directory == void 0) {
    warn("There was no directory provided. Defaulting to process.cwd().");
    config.directory = process.cwd();
  }
  const resolvedDirectory = resolve(config.directory);
  let result = [];
  (_a = config.globPatterns) != null ? _a : config.globPatterns = ["**/*.css"];
  result = globSync(config.globPatterns, {
    cwd: resolvedDirectory
  });
  if (config.debug) {
    log(`Searched directory: ${resolvedDirectory}`);
    log(`Found: ${result.join("	")}`);
  }
  const cssParser = {
    postcssPlugin: "CssLayerGrouper",
    prepare: getParser(config)
  };
  const invalidFiles = [];
  const processor = postcss([cssParser]);
  for (const fileName of result) {
    if (!fileName.endsWith(".css")) {
      invalidFiles.push(fileName);
      continue;
    }
    const fullPath = resolve(resolvedDirectory, fileName);
    const file = readFileSync(fullPath, "utf8");
    processor.process(file, { from: fileName }).then((result2) => {
    });
  }
  if (invalidFiles.length > 0) {
    error(`Globbing resulted in files that did not end in .css:
	${invalidFiles.join("\n	")}`);
  }
  if (missedRules.length > 0) {
    warn(`The target directory: ${config.directory} had ${missedRules.length} css rules that were not parsed.`);
  }
  if (duplicateRules.length > 0) {
    const duplicateSelectors = duplicateRules.map((rule) => rule.selector);
    warn(`There were duplicate rules found:
	${duplicateSelectors.join("\n	")}`);
  }
  return {
    utilities: utilityList,
    components: componentList
  };
};

// src/index.ts
function ParseCSSDirectoryPlugin(directoryPath) {
  return ({ addUtilities, addComponents, e }) => {
    const classes = cssParser_default({ directory: directoryPath, addClassesWithoutLayerAsUtilities: true });
    for (const utility of classes.utilities) {
      addUtilities(e(utility));
    }
    for (const component of classes.components) {
      addComponents(e(component));
    }
  };
}
export {
  ParseCSSDirectoryPlugin,
  cssParser_default as cssParser
};
