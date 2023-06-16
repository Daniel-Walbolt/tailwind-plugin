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
import { LayerParserConfig, LayerListObject } from './types';
import { globSync } from 'glob';

const consoleDisplayName = '[layer-parser]:';

function log(message: string) {
	console.log(`${consoleDisplayName} ${message}`);
}

function warn(warning: string) {
	console.warn(`${consoleDisplayName} ${warning}`);
}

function error(error: string) {
	console.error(`${consoleDisplayName} ${error}`);
}

/**
 * Function for fixing the indentation of a rule and it's nested rules.
 *
 * Without this method, the identation from being in layers would persist after being picked from the layer.
 *
 * Recursively calls itself to fix nested rules.
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

export default (config: LayerParserConfig): LayerListObject => {
	// Store the sum of components and utilities from every document in the directory
	let componentList: Node[] = [];
	let utilityList: Node[] = [];
	let missedRules: Node[] = [];
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
		return (opts = {}) => {
			return {
				Rule(rule: Rule, { result }) {
					// Only add rules that have not been added yet
					if (!processedRules.has(rule.selector)) {
						if (rule.parent?.type == 'root') {
							if (config.addClassesWithoutLayerAsUtilities == undefined) {
								missedRules.push(rule);
								return;
							}
							// This rule is not in a layer, so add it as a utility by default
							fixRuleIndentation(rule);
							adjustRuleRaws(rule, result as Result);
							if (config.addClassesWithoutLayerAsUtilities == true) {
								utilityList.push(rule);
							} else if (config.addClassesWithoutLayerAsUtilities == false) {
								componentList.push(rule);
							}
						} else if (rule.parent?.type == 'atrule') {
							const atRuleParent: AtRule = rule.parent as AtRule;
							// This rule is in an @Rule, check whether it's component or utility layer
							if (atRuleParent.params == 'components') {
								fixRuleIndentation(rule);
								adjustRuleRaws(rule, result as Result);
								componentList.push(rule);
							} else if (atRuleParent.params == 'utilities') {
								fixRuleIndentation(rule);
								adjustRuleRaws(rule, result as Result);
								utilityList.push(rule);
							}
						}
						processedRules.add(rule.selector);
					}
				},
			};
		};
	}

	if (config.directory == undefined) {
		warn('There was no directory provided. Defaulting to process.cwd().');
		config.directory = process.cwd();
	}

	// Resolve the directory provided by the user
	let resolvedDirectory = resolve(config.directory);

	let result: string[] = [];
	config.globPatterns ??= [`**/*.css`];
	result = globSync(config.globPatterns, {
		cwd: resolvedDirectory,
	});

	if (config.debug) {
		log(`Searched directory: ${resolvedDirectory}`);
		log(`Found: ${result.join('\t')}`);
	}

	let invalidFiles = [];
	for (let fileName of result) {
		if (!fileName.endsWith('.css')) {
			invalidFiles.push(fileName);
			continue;
		}
		let fullPath = resolve(resolvedDirectory, fileName);
		let file = readFileSync(fullPath, 'utf8');
		postcss([cssParser])
			.process(file, { from: fileName })
			.then((result) => {});
	}

	if (invalidFiles.length > 0) {
		error(
			`Globbing resulted in files that did not end in .css:\n\t${invalidFiles.join(
				'\n\t'
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
		components: componentList,
	};
};
