// src/cssParser.ts
import { readFileSync } from "fs";
import { resolve } from "path";
import postcss from "postcss";
import { globSync } from "glob";
var consoleDisplayName = "[layer-parser]:";
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
    let formattedSelectors = rule.selectors.join(`,
${selectorIndents}`);
    rule.selector = formattedSelectors;
    rule.raws.between = " ";
  } else if (node.params != void 0) {
    const atRule = node;
    atRule.params = atRule.params.trim();
    atRule.raws.afterName = " ";
    atRule.raws.between = " ";
  }
  for (let child of node.nodes) {
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
var cssParser_default = (config) => {
  var _a;
  let componentList = [];
  let utilityList = [];
  let missedRules = [];
  let processedRules = /* @__PURE__ */ new Set();
  let cssParser = {
    postcssPlugin: "CssLayerGrouper",
    //@ts-ignore
    prepare: getParser()
  };
  function getParser() {
    return (opts = {}) => {
      return {
        Rule(rule, { result: result2 }) {
          var _a2, _b;
          if (!processedRules.has(rule.selector)) {
            if (((_a2 = rule.parent) == null ? void 0 : _a2.type) == "root") {
              if (config.addClassesWithoutLayerAsUtilities == void 0) {
                missedRules.push(rule);
                return;
              }
              fixRuleIndentation(rule);
              adjustRuleRaws(rule, result2);
              if (config.addClassesWithoutLayerAsUtilities == true) {
                utilityList.push(rule);
              } else if (config.addClassesWithoutLayerAsUtilities == false) {
                componentList.push(rule);
              }
            } else if (((_b = rule.parent) == null ? void 0 : _b.type) == "atrule") {
              const atRuleParent = rule.parent;
              if (atRuleParent.params == "components") {
                fixRuleIndentation(rule);
                adjustRuleRaws(rule, result2);
                componentList.push(rule);
              } else if (atRuleParent.params == "utilities") {
                fixRuleIndentation(rule);
                adjustRuleRaws(rule, result2);
                utilityList.push(rule);
              }
            }
            processedRules.add(rule.selector);
          }
        }
      };
    };
  }
  if (config.directory == void 0) {
    warn("There was no directory provided. Defaulting to process.cwd().");
    config.directory = process.cwd();
  }
  let resolvedDirectory = resolve(config.directory);
  let result = [];
  (_a = config.globPatterns) != null ? _a : config.globPatterns = [`**/*.css`];
  result = globSync(config.globPatterns, {
    cwd: resolvedDirectory
  });
  if (config.debug) {
    log(`Searched directory: ${resolvedDirectory}`);
    log(`Found: ${result.join("	")}`);
  }
  let invalidFiles = [];
  for (let fileName of result) {
    if (!fileName.endsWith(".css")) {
      invalidFiles.push(fileName);
      continue;
    }
    let fullPath = resolve(resolvedDirectory, fileName);
    let file = readFileSync(fullPath, "utf8");
    postcss([cssParser]).process(file, { from: fileName }).then((result2) => {
    });
  }
  if (invalidFiles.length > 0) {
    error(
      `Globbing resulted in files that did not end in .css:
	${invalidFiles.join(
        "\n	"
      )}`
    );
  }
  if (missedRules.length > 0) {
    warn(
      `The target directory: ${config.directory} had ${missedRules.length} css rules that were not parsed.`
    );
  }
  return {
    utilities: utilityList,
    components: componentList
  };
};

// src/index.ts
function ParseCSSDirectoryPlugin(directoryPath) {
  return (addUtilities, addComponents, e) => {
    const classes = cssParser_default({ directory: directoryPath });
    for (let utility of classes.utilities) {
      addUtilities(e(utility));
    }
    for (let component of classes.components) {
      addComponents(e(component));
    }
  };
}
export {
  ParseCSSDirectoryPlugin,
  cssParser_default as cssParser
};
