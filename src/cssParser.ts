import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import postcss, {
	AtRule,
	Declaration,
	Document,
	Node,
	Plugin,
	Result,
	Rule,
} from 'postcss';

type LayerListObject = {
	utilities: Node[];
	components: Node[];
};

type CustomTailwindConfig = {
	/**
	 * The path of the directory that you want to be added.
	 *
	 * By default ignores nested directories, only parsing .css files in the directory given.
	 */
	directory: string;

	/**
	 * Should this plugin parse classes that aren't in a component or utilities layer?
	 *
	 * @param true Parse classes without layers as utilities
	 * @param false Parse classes that don't have classes as components.
	 * @param undefined Do not add classes that do not belong to a tailwind layer.
	 */
	addClassesWithoutLayerAsUtilities?: boolean;
};

/**
 * Function for fixing the indentation of a rule and it's nested rules.
 *
 * Without this method, the identation from being in layers
 * @param node
 * @param nesting
 * @returns
 */
function fixRuleIndentation(node: Rule | AtRule, nesting = 1) {
	if (node.nodes == undefined || node.nodes.length == 0) {
		return;
	}

	// The indent for inside curly braces
	let innerIndent = '';
	// The indent for multi-line selectors.
	let selectorIndents = '';
	for (let i = 0; i < nesting; i++) {
		innerIndent += '\t';
		if (i < nesting - 1) {
			selectorIndents += '\t';
		}
	}

	if ((node as Rule).selectors != undefined) {
		const rule = node as Rule;
		let formattedSelectors = rule.selectors.join(`,\n${selectorIndents}`);
		rule.selector = formattedSelectors;
		rule.raws.between = ' ';
	} else if ((node as AtRule).params != undefined) {
		const atRule = node as AtRule;
		atRule.params = atRule.params.trim();
		atRule.raws.afterName = ' ';
		atRule.raws.between = ' ';
	}

	for (let child of node.nodes) {
		child.raws.before = '\n' + innerIndent;
		child.raws.after = '\n' + innerIndent;
		fixRuleIndentation(child as Rule, nesting + 1);
	}
}

function fixDeclarations(declaration: Declaration) {}

/**
 * Used for adjusting a rule's before and after whitespace.
 *
 * Adds a CSS comment to describe what file the rule comes from.
 * @param rule
 * @param result
 */
function adjustRuleRaws(rule: Node, result: Result) {
	rule.raws.before = `\n/* From ${result.opts.from} */\n`;
	rule.raws.between = ' ';
	rule.raws.after = '\n';
}

export default (config: CustomTailwindConfig): LayerListObject => {
	// Store the sum of components and utilities from every document in the directory
	let componentList: Node[] = [];
	let utilityList: Node[] = [];
	// Used for not adding the same rule twice
	let processedRules: Set<string> = new Set();
	let cssParser: Plugin = {
		postcssPlugin: 'CssLayerGrouper',
		//@ts-ignore
		prepare: getParser(),
	};

	/** Function that returns the PostCSS plugin object.
	 * Parses css file and retrieves the first nested rules in
	 * @layer utilities and @layer components as well as non-nested rules.
	 */
	function getParser() {
		let documentComponents: Node[] = [];
		let documentUtilities: Node[] = [];
		return (opts = {}) => {
			return {
				Once(document: Document) {
					documentComponents = [];
					documentUtilities = [];
				},
				Rule(rule: Rule, { result }) {
					// Only add rules that have not been added yet
					if (!processedRules.has(rule.selector)) {
						if ((rule.parent as AtRule).params == undefined) {
							// This rule is not in a layer, so add it as a utility by default
							fixRuleIndentation(rule);
							adjustRuleRaws(rule, result as Result);
							documentUtilities.push(rule);
						} else {
							const atRuleParent: AtRule = rule.parent as AtRule;
							// This rule is in an @Rule, check whether it's component or utility layer
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
			};
		};
	}

	if (config.directory == undefined) {
		console.error('There was no directory provided');
		return {
			components: [],
			utilities: [],
		};
	}

	let resolvedDirectory = resolve(config.directory);
	let result = readdirSync(resolvedDirectory);
	for (let path of result) {
		if (!path.endsWith('.css')) {
			continue;
		}
		let fullPath = resolve(resolvedDirectory, path);
		let file = readFileSync(fullPath, 'utf8');
		postcss([cssParser])
			.process(file, { from: path })
			.then((result) => {});
	}

	return {
		utilities: utilityList,
		components: componentList,
	};
};
