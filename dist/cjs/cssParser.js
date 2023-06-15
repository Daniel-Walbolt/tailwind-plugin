"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var postcss_1 = require("postcss");
/**
 * Function for fixing the indentation of a rule and it's nested rules.
 *
 * Without this method, the identation from being in layers will persist into the intellisense preview.
 * @param rule
 * @param nesting
 * @returns
 */
function fixRuleIndentation(rule, nesting) {
    if (nesting === void 0) { nesting = 1; }
    if (rule.nodes == undefined || rule.nodes.length == 0) {
        return;
    }
    for (var _i = 0, _a = rule.nodes; _i < _a.length; _i++) {
        var node = _a[_i];
        node.raws.before = '\n';
        node.raws.after = '\n';
        for (var i = 0; i < nesting; i++) {
            node.raws.after += '	';
            node.raws.before += '	';
        }
        fixRuleIndentation(node, nesting + 1);
    }
}
function fixDeclarations(declaration) {
}
/**
 * Used for adjusting a rule's before and after whitespace.
 *
 * Adds a CSS comment to describe what file the rule comes from.
 *
 * @param rule
 * @param result
 */
function adjustRuleRaws(rule, result) {
    rule.raws.before = "\n/* From ".concat(result.opts.from, " */\n");
    rule.raws.between = " ";
    rule.raws.after = '\n';
}
exports.default = (function (resolvedDirectory) {
    // Store the sum of components and utilities from every document in the directory
    var componentList = [];
    var utilityList = [];
    // Used for not adding the same rule twice
    var processedRules = new Set();
    var cssParser = {
        postcssPlugin: 'CssLayerGrouper',
        //@ts-ignore
        prepare: getParser()
    };
    /** Function that returns the PostCSS plugin object.
     * Parses css file and retrieves the first nested rules in
     * @layer utilities and @layer components as well as non-nested rules. */
    function getParser() {
        var documentComponents = [];
        var documentUtilities = [];
        return function (opts) {
            if (opts === void 0) { opts = {}; }
            return {
                Once: function (document) {
                    documentComponents = [];
                    documentUtilities = [];
                },
                Rule: function (rule, _a) {
                    var result = _a.result;
                    // Only add rules that have not been added yet
                    if (!processedRules.has(rule.selector)) {
                        if (rule.parent == undefined) {
                            // This rule is not in a layer, so add it as a utility by default
                            fixRuleIndentation(rule);
                            adjustRuleRaws(rule, result);
                            documentUtilities.push(rule);
                        }
                        else if (rule.parent.params != undefined) {
                            var atRuleParent = rule.parent;
                            // This rule is in a list, check whether it's component or utility layer
                            if (atRuleParent.params == 'components') {
                                fixRuleIndentation(rule);
                                adjustRuleRaws(rule, result);
                                documentComponents.push(rule);
                            }
                            else if (atRuleParent.params == 'utilities') {
                                fixRuleIndentation(rule);
                                adjustRuleRaws(rule, result);
                                documentUtilities.push(rule);
                            }
                        }
                        processedRules.add(rule.selector);
                    }
                },
                Declaration: function (declaration) {
                    fixDeclarations(declaration);
                },
                OnceExit: function (document, _a) {
                    var result = _a.result;
                    componentList.push.apply(componentList, documentComponents);
                    utilityList.push.apply(utilityList, documentUtilities);
                },
            };
        };
    }
    var result = (0, fs_1.readdirSync)(resolvedDirectory);
    for (var _i = 0, result_1 = result; _i < result_1.length; _i++) {
        var path = result_1[_i];
        if (!path.endsWith(".css")) {
            continue;
        }
        var fullPath = (0, path_1.resolve)(resolvedDirectory, path);
        var file = (0, fs_1.readFileSync)(fullPath, 'utf8');
        (0, postcss_1.default)([cssParser]).process(file, { from: path }).then(function (result) {
        });
    }
    return {
        utilities: utilityList,
        components: componentList
    };
});
