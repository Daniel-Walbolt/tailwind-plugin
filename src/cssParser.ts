import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss, { AtRule, Node, Plugin, Result, Rule } from 'postcss';
import { LayerParserConfig, LayerListObject } from './types';
import { globSync } from 'glob';

const consoleDisplayName = '[layer-parser]:';
// The string used when joining lists to display them in the console.
const consoleListJoinString = ',\n\t';
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
function fixRuleIndentation(node: Rule | AtRule, config: LayerParserConfig, nesting = 1) 
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

	let desiredBetween = config.openBracketNewLine ? `\n${selectorIndents}` : ' ';

	if ((node as Rule).selectors != undefined) 
	{
		const rule = node as Rule;
		const formattedSelectors = rule.selectors.join(`,\n${selectorIndents}`);
		rule.selector = formattedSelectors;
		rule.raws.between = desiredBetween;
	}
	else if ((node as AtRule).params != undefined) 
	{
		const atRule = node as AtRule;
		atRule.params = atRule.params.trim();
		atRule.raws.afterName = ' ';
		atRule.raws.between = desiredBetween;
	}

	for (const child of node.nodes) 
	{
		child.raws.before = '\n' + innerIndent;
		child.raws.after = '\n' + innerIndent;
		fixRuleIndentation(child as Rule, config, nesting + 1);
	}
	return selectorIndents;
}

/**
 * Used for adjusting a rule's before and after whitespace.
 *
 * Adds a CSS comment to describe what file the rule comes from.
 * @param rule
 * @param result
 */
function adjustRuleRaws(rule: Node, result: Result, config: LayerParserConfig, selectorIndent: string) 
{
	rule.raws.before = '\n';
	if  (config.commentType !== "None")
	{
		rule.raws.before += `/* From ${result.opts.from} */\n`;
	}
	rule.raws.after = '\n';
}

/**
 * Check if the target rule has been processed by some instance of the parser.
 * 
 * If the rule has not been processed, marks it as processed.
 * 
 * Also identifies rules that have matching selectors, rather than just the rule itself.
 * @param rule
 * @returns 
 */
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

/** 
 * Function that returns the PostCSS plugin object.
 * Parses css file and performs validation and adjustments on rules.
 * Adds processed rules to arrays.
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
						if (config.unlayeredClassBehavior == "Ignore") 
						{
							missedRules.push(rule);
							return;
						}

						let selectorIndent = fixRuleIndentation(rule, config);
						adjustRuleRaws(rule, result as Result, config, selectorIndent);
						if (config.unlayeredClassBehavior == "Utility") 
						{
							utilityList.push(rule);
						}
						else if (config.unlayeredClassBehavior == "Component") 
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
							let selectorIndent = fixRuleIndentation(rule, config);
							adjustRuleRaws(rule, result as Result, config, selectorIndent);
							componentList.push(rule);
						}
						else if (atRuleParent.params == 'utilities') 
						{
							let selectorIndent = fixRuleIndentation(rule, config);
							adjustRuleRaws(rule, result as Result, config, selectorIndent);
							utilityList.push(rule);
						}
					}
				}
			}
		};
	};
}

export default (config: LayerParserConfig): LayerListObject => 
{
	if (config.globPatterns != undefined && config.globPatterns.length > 0) {
		for (let pattern of config.globPatterns) {
			if (pattern.startsWith('/**')) {
				error(`User attempted to glob their entire computer using: ${pattern}. This would result in a serious performance problem, and thus parsing has been skipped.`);
				return {
					components: [],
					utilities: []
				}
			}
		}
	}
	config.commentType ??= "File";
	config.openBracketNewLine ??= false;
	config.debug ??= false;
	config.unlayeredClassBehavior ??= "Utility";
	config.globPatterns ??= ['**/*.css'];

	if (config.directory == undefined) 
	{
		warn('There was no directory provided. Defaulting to process.cwd().');
		config.directory = process.cwd();
	}
	
	// Resolve the directory provided by the user
	const resolvedDirectory = resolve(config.directory);
	
	let result: string[] = [];
	result = globSync(config.globPatterns, {
		cwd: resolvedDirectory,
	});
	
	log(`Searched directory: ${resolvedDirectory}`);
	if (config.debug) 
	{
		log(`Found: ${result.join('\t')}`);
	}
	
	// Initialize the custom parser
	const cssParser: Plugin = {
		postcssPlugin: 'layer-parser',
		prepare: getParser(config),
	};

	const invalidFiles = [];
	const processor = postcss([cssParser]);
	let parseFile: (fileName: string, fullPath: string) => void;
	switch (config.commentType) {
		case "Absolute":
			parseFile = (fileName: string, fullPath: string) => {
				const file = readFileSync(fullPath, 'utf8');
				processor.process(file, { from: fullPath, to: fullPath }).then((result) => {});
			}
			break;
		default:
			parseFile = (fileName: string, fullPath: string) => {
				const file = readFileSync(fullPath, 'utf8');
				processor.process(file, { from: fileName, to: fileName }).then((result) => {});
			}
			break;
	}

	for (const fileName of result) 
	{
		if (!fileName.endsWith('.css')) 
		{
			invalidFiles.push(fileName);
			continue;
		}
		const fullPath = resolve(resolvedDirectory, fileName);
		parseFile(fileName, fullPath);
	}

	if (invalidFiles.length > 0) 
	{
		warn(`Globbing resulted in files that did not end in .css:\n\t${invalidFiles.join(consoleListJoinString)}`);
	}

	if (missedRules.length > 0) 
	{
		let warnMessage = `The target directory: ${config.directory} had ${missedRules.length} unlayered css rules not parsed:`;
		if (config.debug) {
			// Get all the missedRule's selectors and display each on a new line.
			warnMessage += `\n\t${missedRules.map(rule => (rule as Rule).selector.replace('\n','')).join(consoleListJoinString)}`;
		}
		warn(warnMessage);
	}

	if (duplicateRules.length > 0) 
	{
		let warnMessage = `The target directory: ${config.directory} had ${duplicateRules.length} rules with selectors that were already used (two styles for the same elements). Note, this only discovers duplicates in the TOP level of a layer or document, NOT nested styles.`
		if (config.debug) {
			// Get all the duplicate rule selectors and display each on a new line.
			warnMessage += `\n\t${duplicateRules.map((rule) => (rule as Rule).selector.replace('\n', '')).join(consoleListJoinString)}`;
		}
		warn(warnMessage);
	}

	return {
		utilities: utilityList,
		components: componentList,
	};
};
