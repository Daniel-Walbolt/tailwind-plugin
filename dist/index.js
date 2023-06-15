var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// src/cssParser.ts
var cssParser_exports = {};
__export(cssParser_exports, {
  default: () => cssParser_default
});
function fixRuleIndentation(rule, nesting = 1) {
  if (rule.nodes == void 0 || rule.nodes.length == 0) {
    return;
  }
  for (let node of rule.nodes) {
    node.raws.before = "\n";
    node.raws.after = "\n";
    for (let i = 0; i < nesting; i++) {
      node.raws.after += "	";
      node.raws.before += "	";
    }
    fixRuleIndentation(node, nesting + 1);
  }
}
function fixDeclarations(declaration) {
}
function adjustRuleRaws(rule, result) {
  rule.raws.before = `
/* From ${result.opts.from} */
`;
  rule.raws.between = " ";
  rule.raws.after = "\n";
}
var import_fs, import_path, import_postcss, cssParser_default;
var init_cssParser = __esm({
  "src/cssParser.ts"() {
    import_fs = require("fs");
    import_path = require("path");
    import_postcss = __toESM(require("postcss"));
    cssParser_default = (resolvedDirectory) => {
      let componentList = [];
      let utilityList = [];
      let processedRules = /* @__PURE__ */ new Set();
      let cssParser2 = {
        postcssPlugin: "CssLayerGrouper",
        //@ts-ignore
        prepare: getParser()
      };
      function getParser() {
        let documentComponents = [];
        let documentUtilities = [];
        return (opts = {}) => {
          return {
            Once(document) {
              documentComponents = [];
              documentUtilities = [];
            },
            Rule(rule, { result: result2 }) {
              if (!processedRules.has(rule.selector)) {
                if (rule.parent == void 0) {
                  fixRuleIndentation(rule);
                  adjustRuleRaws(rule, result2);
                  documentUtilities.push(rule);
                } else if (rule.parent.params != void 0) {
                  const atRuleParent = rule.parent;
                  if (atRuleParent.params == "components") {
                    fixRuleIndentation(rule);
                    adjustRuleRaws(rule, result2);
                    documentComponents.push(rule);
                  } else if (atRuleParent.params == "utilities") {
                    fixRuleIndentation(rule);
                    adjustRuleRaws(rule, result2);
                    documentUtilities.push(rule);
                  }
                }
                processedRules.add(rule.selector);
              }
            },
            Declaration(declaration) {
              fixDeclarations(declaration);
            },
            OnceExit(document, { result: result2 }) {
              componentList.push(...documentComponents);
              utilityList.push(...documentUtilities);
            }
          };
        };
      }
      let result = (0, import_fs.readdirSync)(resolvedDirectory);
      for (let path of result) {
        if (!path.endsWith(".css")) {
          continue;
        }
        let fullPath = (0, import_path.resolve)(resolvedDirectory, path);
        let file = (0, import_fs.readFileSync)(fullPath, "utf8");
        (0, import_postcss.default)([cssParser2]).process(file, { from: path }).then((result2) => {
        });
      }
      return {
        utilities: utilityList,
        components: componentList
      };
    };
  }
});

// src/index.ts
var cssParser = (init_cssParser(), __toCommonJS(cssParser_exports));
function ParseCSSDirectoryPlugin(directoryPath) {
  return (addUtilities, addComponents, e) => {
    const classes = cssParser(directoryPath);
    for (let utility of classes.utilities) {
      addUtilities(e(utility));
    }
    for (let component of classes.components) {
      addComponents(e(component));
    }
  };
}
module.exports = {
  cssParser,
  ParseCSSDirectoryPlugin
};
