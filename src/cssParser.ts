import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import postcss, { AtRule, Declaration, Document, Plugin, Result, Rule } from 'postcss';

type LayerListObject = {
	utilities: Rule[],
	components: Rule[]
}

/**
 * Function for fixing the indentation of a rule and it's nested rules.
 * 
 * Without this method, the identation from being in layers will persist into the intellisense preview.
 * @param rule 
 * @param nesting 
 * @returns 
 */
function fixRuleIndentation(rule: Rule, nesting = 1) {
	if (rule.nodes == undefined || rule.nodes.length == 0) {
		return;
	}
	for (let node of rule.nodes) {
		node.raws.before = '\n';
		node.raws.after = '\n';
		for (let i = 0; i < nesting; i++) {
			node.raws.after += '	';
			node.raws.before += '	';
		}
		fixRuleIndentation(node as Rule, nesting + 1);
	}
}

function fixDeclarations(declaration: Declaration) {
}

/**
 * Used for adjusting a rule's before and after whitespace.
 * 
 * Adds a CSS comment to describe what file the rule comes from.
 * 
 * @param rule 
 * @param result 
 */
function adjustRuleRaws(rule: Rule, result: Result) {
	rule.raws.before = `\n/* From ${result.opts.from} */\n`;
	rule.raws.between = " ";
	rule.raws.after = '\n';
}

export default (resolvedDirectory: string): LayerListObject => {
	// Store the sum of components and utilities from every document in the directory
	let componentList: Rule[] = [];
	let utilityList: Rule[] = [];
	// Used for not adding the same rule twice
	let processedRules: Set<string> = new Set();
	let cssParser: Plugin = {
		postcssPlugin: 'CssLayerGrouper',
		//@ts-ignore
		prepare: getParser()
	};

	/** Function that returns the PostCSS plugin object. 
	 * Parses css file and retrieves the first nested rules in 
	 * @layer utilities and @layer components as well as non-nested rules. */
	function getParser() {
		let documentComponents: Rule[] = [];
		let documentUtilities: Rule[] = [];
		return (opts = {}) => {
			return {
				Once(document: Document) {
					documentComponents = [];
					documentUtilities = [];
				},
				Rule(rule: Rule, { result }) {
					// Only add rules that have not been added yet
					if (!processedRules.has(rule.selector)) {
						if (rule.parent == undefined) {
							// This rule is not in a layer, so add it as a utility by default
							fixRuleIndentation(rule);
							adjustRuleRaws(rule, result as Result);
							documentUtilities.push(rule);
						}
						else if ((rule.parent as AtRule).params != undefined) {
							const atRuleParent: AtRule = rule.parent as AtRule;
							// This rule is in a list, check whether it's component or utility layer
							if (atRuleParent.params == 'components') {
								fixRuleIndentation(rule);
								adjustRuleRaws(rule, result as Result);
								documentComponents.push(rule);
							} else if (atRuleParent.params == 'utilities') {
								fixRuleIndentation(rule);
								adjustRuleRaws(rule, result as Result);
								documentUtilities.push(rule);
							}	
						}
						processedRules.add(rule.selector);
					}
				},
				Declaration(declaration: Declaration) {
					fixDeclarations(declaration);
				},
				OnceExit(document: Document, { result }) {
					componentList.push(...documentComponents);
					utilityList.push(...documentUtilities);
				},
			}
		};
	}

	let result = readdirSync(resolvedDirectory);
	for (let path of result) {
		if (!path.endsWith(".css")) {
			continue;
		}
		let fullPath = resolve(resolvedDirectory, path);
		let file = readFileSync(fullPath, 'utf8');
		postcss([cssParser]).process(file, { from: path }).then((result) => {
		})
	}

	return {
		utilities: utilityList,
		components: componentList
	}

};