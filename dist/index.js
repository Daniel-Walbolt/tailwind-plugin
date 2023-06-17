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
  ParseCSSDirectoryPlugin: () => ParseCSSDirectoryPlugin,
  cssParser: () => cssParser_default
});
module.exports = __toCommonJS(src_exports);

// src/cssParser.ts
var import_fs = require("fs");
var import_path = require("path");
var import_postcss = __toESM(require("postcss"));
var import_glob = require("glob");
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
  const resolvedDirectory = (0, import_path.resolve)(config.directory);
  let result = [];
  (_a = config.globPatterns) != null ? _a : config.globPatterns = ["**/*.css"];
  result = (0, import_glob.globSync)(config.globPatterns, {
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
  const processor = (0, import_postcss.default)([cssParser]);
  for (const fileName of result) {
    if (!fileName.endsWith(".css")) {
      invalidFiles.push(fileName);
      continue;
    }
    const fullPath = (0, import_path.resolve)(resolvedDirectory, fileName);
    const file = (0, import_fs.readFileSync)(fullPath, "utf8");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ParseCSSDirectoryPlugin,
  cssParser
});
