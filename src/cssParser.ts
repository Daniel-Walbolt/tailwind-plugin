import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss, { AtRule, Node, Plugin, Result, Rule } from 'postcss';
import { LayerParserConfig, LayerListObject } from './types';
import { globSync } from 'glob';

const consoleDisplayName = '[layer-parser]:';
// Store the sum of components and utilities from every document in the directory
const componentList: Node[] = [];
const utilityList: Node[] = [];
const missedRules: Node[] = [];
// Used for not adding the same rule twice
const processedRules: Set<string> = new Set();
const duplicateRules: Node[] = [];

function log(message: string) 
{
	console.log(`${consoleDisplayName} ${message}`);
}

function warn(warning: string) 
{
	console.warn(`${consoleDisplayName} ${warning}`);
}

function error(error: string) 
{
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
function fixRuleIndentation(node: Rule | AtRule, nesting = 1) 
{
	if (node.nodes == undefined || node.nodes.length == 0) 
	{
		return;
	}

	// The indent for inside curly braces
	let innerIndent = '';
	// The indent for multi-line selectors.
	let selectorIndents = '';
	for (let i = 0; i < nesting; i++) 
	{
		innerIndent += '\t';
		if (i < nesting - 1) 
		{
			selectorIndents += '\t';
		}
	}

	if ((node as Rule).selectors != undefined) 
	{
		const rule = node as Rule;
		const formattedSelectors = rule.selectors.join(`,\n${selectorIndents}`);
		rule.selector = formattedSelectors;
		rule.raws.between = ' ';
	}
	else if ((node as AtRule).params != undefined) 
	{
		const atRule = node as AtRule;
		atRule.params = atRule.params.trim();
		atRule.raws.afterName = ' ';
		atRule.raws.between = ' ';
	}

	for (const child of node.nodes) 
	{
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
function adjustRuleRaws(rule: Node, result: Result) 
{
	rule.raws.before = `\n/* From ${result.opts.from} */\n`;
	rule.raws.between = ' ';
	rule.raws.after = '\n';
}

function hasNotProcessedRule(rule: Rule) 
	{
		if (processedRules.has(rule.selector)) 
		{
			duplicateRules.push(rule);
			return false;
		}
		else 
		{
			processedRules.add(rule.selector);
			return true;
		}
	}

/** Function that returns the PostCSS plugin object.
 * Parses css file and retrieves the first nested rules in
 * @layer utilities and @layer components as well as non-nested rules.
 */
function getParser(config: LayerParserConfig): (opts: any) => any
{
	return () => 
	{
		return {
			Rule(rule: Rule, { result }) 
			{
				// Check if the rule is a base-level selector in css file.
				if (rule.parent?.type == 'root') 
				{
					// Check if any other file has processed this rule
					if (hasNotProcessedRule(rule)) 
					{
						if (config.addClassesWithoutLayerAsUtilities == undefined) 
						{
							missedRules.push(rule);
							return;
						}

						fixRuleIndentation(rule);
						adjustRuleRaws(rule, result as Result);
						if (config.addClassesWithoutLayerAsUtilities == true) 
						{
							utilityList.push(rule);
						}
						else if (config.addClassesWithoutLayerAsUtilities == false) 
						{
							componentList.push(rule);
						}
					}
				}
				// Check if the at rule exists in a layer
				else if (rule.parent?.type == 'atrule') 
				{
					if (hasNotProcessedRule(rule))
					{
						const atRuleParent: AtRule = rule.parent as AtRule;
						// This rule is in an @Rule, check whether it's component or utility layer
						if (atRuleParent.params == 'components') 
						{
							fixRuleIndentation(rule);
							adjustRuleRaws(rule, result as Result);
							componentList.push(rule);
						}
						else if (atRuleParent.params == 'utilities') 
						{
							fixRuleIndentation(rule);
							adjustRuleRaws(rule, result as Result);
							utilityList.push(rule);
						}
					}
				}
			},
		};
	};
}

export default (config: LayerParserConfig): LayerListObject => 
{

	if (config.directory == undefined) 
	{
		warn('There was no directory provided. Defaulting to process.cwd().');
		config.directory = process.cwd();
	}
	
	// Resolve the directory provided by the user
	const resolvedDirectory = resolve(config.directory);
	
	let result: string[] = [];
	config.globPatterns ??= ['**/*.css'];
	result = globSync(config.globPatterns, {
		cwd: resolvedDirectory,
	});
	
	if (config.debug) 
	{
		log(`Searched directory: ${resolvedDirectory}`);
		log(`Found: ${result.join('\t')}`);
	}
	
	// Initialize the custom parser
	const cssParser: Plugin = {
		postcssPlugin: 'CssLayerGrouper',
		prepare: getParser(config),
	};

	const invalidFiles = [];
	const processor = postcss([cssParser]);
	for (const fileName of result) 
	{
		if (!fileName.endsWith('.css')) 
		{
			invalidFiles.push(fileName);
			continue;
		}
		const fullPath = resolve(resolvedDirectory, fileName);
		const file = readFileSync(fullPath, 'utf8');
		processor.process(file, { from: fileName }).then((result) => {});
	}

	if (invalidFiles.length > 0) 
	{
		error(`Globbing resulted in files that did not end in .css:\n\t${invalidFiles.join(	'\n\t')}`);
	}

	if (missedRules.length > 0) 
	{
		warn(`The target directory: ${config.directory} had ${missedRules.length} css rules that were not parsed.`);
	}

	if (duplicateRules.length > 0) 
	{
		const duplicateSelectors = duplicateRules.map((rule) => (rule as Rule).selector);
		warn(`There were duplicate rules found:\n\t${duplicateSelectors.join('\n\t')}`);
	}

	return {
		utilities: utilityList,
		components: componentList,
	};
};
