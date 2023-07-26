import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss, { AtRule, Declaration, Node, Plugin, Result, Rule } from 'postcss';
import { LayerParserConfig, LayerListObject } from './types';
import { globSync } from 'glob';

const consoleMessagePrefix = '[layer-parser]:';
/** The string used when joining lists to display them in the console. Indents more upon request */
const consoleListJoinString = (nested: number = 1) => {
	let separator = "\n";
	for (let i = 0; i < nested; i++)
	{
		separator += '\t';
	}
	separator += "- ";
	return separator;
};
// Store the sum of components and utilities from every document in the directory. Works across instances of the cssParser function.
const components: Map<string, Rule> = new Map();
const utilities: Map<string, Rule> = new Map();

// Store the processed keyframes
const keyframes: Map<string, AtRule> = new Map();

// Store the queue for keyframes requested by rules. Each key stores a set of the rule selectors
const neededKeyFrames: Map<string, Set<string>> = new Map();

let duplicateRules: Map<string, Map<string, number>> = new Map(); // Re-evaluated on each run <selector, <location, count in location>>
let missedRules: Map<string, Set<string>> = new Map(); // Re-evaluated on each run. <selector, file names>

function log(message: string) 
{
	console.log(`${consoleMessagePrefix} ${message}`);
}

function warn(warning: string) 
{
	console.warn(`${consoleMessagePrefix} ${warning}`);
}

function error(error: string) 
{
	console.error(`${consoleMessagePrefix} ${error}`);
}

/**
 * Function for fixing the indentation of a rule and it's nested rules.
 *
 * Without this method, the identation from being in layers would persist after being picked from the layer.
 *
 * Recursively calls itself to fix nested rules.
 */
function adjustNodeRaws(node: Rule | AtRule, config: LayerParserConfig, result: Result, nesting = 1) 
{
	if (node.nodes == undefined || node.nodes.length == 0) 
	{
		return;
	}

	// The indent for inside curly braces
	let innerIndent = '';

	// The indent for multi-line selectors.
	let selectorIndents = '';

	//#region define the indents based on the nesting level
	for (let i = 0; i < nesting; i++) 
	{
		innerIndent += '\t';
		if (i < nesting - 1) 
		{
			selectorIndents += '\t';
		}
	}
	//#endregion

	let desiredBetween = config.openBracketNewLine ? `\n${selectorIndents}` : ' ';

	//#region Format the selectors for rules and parameters for AtRules
	if (node.type === 'rule') 
	{
		const rule = node as Rule;
		const formattedSelectors = rule.selectors.join(`,\n${selectorIndents}`);
		rule.selector = formattedSelectors;
		rule.raws.between = desiredBetween;
	}
	else if (node.type == 'atrule') 
	{
		const atRule = node as AtRule;
		atRule.params = atRule.params.trim();
		atRule.raws.afterName = ' ';
		atRule.raws.between = desiredBetween;
	}
	//#endregion

	//#region Format the nodes within this node recursively.
	for (const child of node.nodes) 
	{
		child.raws.before = '\n' + innerIndent;
		child.raws.after = '\n' + innerIndent;
		adjustNodeRaws(child as Rule, config, result, nesting + 1);
	}
	//#endregion

	//#region Add comment and spacing to node if it's in the first layer of nesting
	if (nesting == 1)
	{
		node.raws.before = '\n';
		if  (config.commentType !== "None")
		{
			node.raws.before += `/* From ${result.opts.from} */\n`;
		}
		node.raws.after = '\n';
	}
	//#endregion
}

/**
 * Check if the target rule has been processed.
 * 
 * If the rule has not been processed, marks it as processed.
 * 
 * Identifies rules that have matching selectors, rather than just the rule itself.
 */
function hasNotProcessedRule(rule: Rule | AtRule, result: Result) 
{

	let ruleIdentifier = getIdentifier(rule);

	if (utilities.has(ruleIdentifier) || components.has(ruleIdentifier))
	{
		let nodeStatistic: Map<string, number> = duplicateRules.get(ruleIdentifier);
		if (nodeStatistic)
		{
			let nodeFileCount: number = nodeStatistic?.get(result.opts.from);
			if (nodeFileCount)
			{
				// If the node was already found in this file, increment its count
				nodeStatistic.set(result.opts.from, nodeFileCount + 1);
			}
			else
			{
				nodeStatistic.set(result.opts.from, 1);
			}
		}
		else
		{
			// The node was not already found in this file, create a new entry in the map.
			duplicateRules.set(ruleIdentifier, new Map([[result.opts.from, 1]]))
		}
		return false;
	}
	
	return true;
}

/**
 * Function for getting the identifier for a rule or atrule.
 */
function getIdentifier(node: Rule | AtRule)
{
	let ruleIdentifier = "";
	if (node.type == 'rule')
	{
		node = node as Rule;
		ruleIdentifier = node.selector;
	}
	else if (node.type == 'atrule')
	{
		node = node as AtRule;
		ruleIdentifier = `@${node.name} ${node.params}`;
	}
	return ruleIdentifier;
}

/**
 * Processes rules or atrules into the component or utiltity lists based on their parent layers.
 */
function processRule(rule: Rule, result: Result, config: LayerParserConfig)
{

	let ruleIdentifier = getIdentifier(rule);

	// Check if the rule is at the base-level of the css file.
	if (rule.parent?.type === 'root')   
	{
		if (hasNotProcessedRule(rule, result)) 
		{
			if (config.unlayeredClassBehavior === "Ignore") 
			{
				let files: Set<string> = missedRules.get(ruleIdentifier) ?? new Set();
				files.add(result.opts.from as string);
				missedRules.set(ruleIdentifier, files);
				return;
			}

			if (config.unlayeredClassBehavior === "Utility") 
			{				
				adjustNodeRaws(rule, config, result);
				utilities.set(ruleIdentifier, rule);
			}
			else if (config.unlayeredClassBehavior === "Component") 
			{
				adjustNodeRaws(rule, config, result);
				components.set(ruleIdentifier, rule);
			}
		}
	}
	// Otherwise check if the at rule exists in a layer
	else if (rule.parent?.type == 'atrule') 
	{
		if (hasNotProcessedRule(rule, result))
		{
			const atRuleParent: AtRule = rule.parent as AtRule;
			// This rule is in an @Rule, check whether it's component or utility layer
			if (atRuleParent.params === 'components') 
			{
				adjustNodeRaws(rule, config, result);
				components.set(ruleIdentifier, rule);
			}
			else if (atRuleParent.params === 'utilities') 
			{
				adjustNodeRaws(rule, config, result);
				utilities.set(ruleIdentifier, rule);
			}
		}
	}

}

function processAtRule(atRule: AtRule, result: Result, config: LayerParserConfig)
{
	let ruleIdentifier = getIdentifier(atRule);

	keyframes.set(ruleIdentifier, atRule); // Update the map with the newest keyframe
}

/**
 * Get the top-most parent rule of the given node.
 */
function getTopRule(node: Node, config: LayerParserConfig)
{
	let nextParent = node.parent;
	let parent = node; 
	let isTopParent = false;
	// Continue getting the node's parent until the parent's type is 'root'
	while (!isTopParent && nextParent != null)
	{
		if (nextParent.type === 'root')
		{
			if (parent.type == 'rule')
			{
				// If the current parent is a rule and the next parent is the root, that means there is no layer.
				// Check if the user wants unlayed rules to be added.
				if (config.unlayeredClassBehavior == "Ignore")
				{
					return null;
				}
				isTopParent = true;
				continue;
			}
		}
		else if (nextParent.type === 'atrule')
		{
			const atRuleParent = nextParent as AtRule;

			if (atRuleParent.name !== 'layer')
			{
				continue;
			}

			if (atRuleParent.params === 'components' || atRuleParent.params === 'utilities')
			{
				// The parent is @layer components or @layer utilities
				isTopParent = true;
				continue;
			}
		}

		// Move to the next parent
		parent = nextParent;
		nextParent = nextParent.parent;
	}
	log("Found parent " + parent.toString())
	return parent;
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
				processRule(rule, result, config);
			},
			AtRule:
			{
				media: (atRule: AtRule, { result }) => {
					processAtRule(atRule, result, config);
				},
				keyframes: (atRule: AtRule, { result }) => {
					processAtRule(atRule, result, config);
				}
			},
			Declaration:
			{
				"animation-name": (declaration: Declaration, { result }) => {
					const topParent = getTopRule(declaration, config);
					if (topParent != null && topParent.type == 'rule')
					{
						const identifier = getIdentifier(topParent as Rule);
						const set = neededKeyFrames.get(declaration.value) ?? new Set();
						set.add(identifier); // Add the top most parent identifier to the list
						neededKeyFrames.set(`@keyframes ${declaration.value}`, set); // This needs to match the identifier that gets put into the keyframes map.			
					}
				}
			}
		};
	};
}

function assignKeyframesToRules()
{
	log("Assigning keyframes to rules")
	for (const [keyframeIdentifier, ruleIdentifiers] of neededKeyFrames.entries())
	{
		log("Keyframe: " + keyframeIdentifier + " being added to");
		let keyframe = keyframes.get(keyframeIdentifier);
		if (keyframe == null)
		{
			continue;
		}
		for (let ruleIdentifier of ruleIdentifiers)
		{
			log("Rule identifier: " + ruleIdentifier);
			const targetMap = components.has(ruleIdentifier) ? components : utilities.has(ruleIdentifier) ? utilities : undefined;
			
			if (targetMap == undefined)
			{
				continue;
			}

			let rule = targetMap.get(ruleIdentifier);

			if (rule == null)
			{
				continue;
			}
			
			log(ruleIdentifier + " nodes " + rule.nodes.length);
			rule.nodes = [keyframe, ...rule.nodes]
			targetMap.set(ruleIdentifier, rule);
			log(ruleIdentifier + " nodes " + rule.nodes.length);
		}
	}
}

function verifyConfiguration(config: LayerParserConfig) 
{

	const verifyBoolean = (bool: boolean) => bool !== true && bool !== false

	if (config.directory == undefined) 
	{
		warn('There was no directory provided. Defaulting to process.cwd().');
		config.directory = process.cwd();
	}

	config.commentType ??= "File";
	if (config.commentType !== "File" && config.commentType != "Absolute" && config.commentType != "None")
	{
		warn("Invalid configuration for commentType. Defaulting to 'File'");
		config.commentType = "File";
	}

	config.openBracketNewLine ??= false;
	if (verifyBoolean(config.openBracketNewLine))
	{
		warn("Invalid configuration for openBracketNewLine. Defaulting to false");
		config.openBracketNewLine = false;
	}

	config.debug ??= false;
	if (verifyBoolean(config.debug))
	{
		warn("Invalid configuration for debug. Defaulting to false.");
		config.debug = false;
	}
	
	config.unlayeredClassBehavior ??= "Utility";
	if (config.unlayeredClassBehavior !== "Utility" && config.unlayeredClassBehavior !== "Component" && config.unlayeredClassBehavior !== "Ignore")
	{
		// User has forcefully input class behavior other than the provided type.
		warn("Invalid configuration for unlayedClassBehavior. Defaulting to Utility");
		config.unlayeredClassBehavior = "Utility";
	}

	config.globPatterns ??= ['**/*.css'];
}

/**
 * Resets the parsed utilities and components.
 * 
 * Useful for parsing separate directories of css stylings for different tailwind configurations.
 * 
 * Used by default by the plugin helper function.
 */
export function resetData()
{
	if (components.size == 0 && utilities.size == 0) 
	{
		log("Reset parsed components and utilities.");
	}
	components.clear();
	utilities.clear();
}

export function cssParser(config: LayerParserConfig): LayerListObject
{
	if (config.globPatterns != undefined && config.globPatterns.length > 0) 
	{
		for (let pattern of config.globPatterns) 
		{
			if (pattern.startsWith('/**')) 
			{
				error(`User attempted to glob their entire computer using: ${pattern}. This would result in a serious performance problem, and thus parsing has been skipped.`);
				return {
					components: [],
					utilities: []
				}
			}
		}
	}

	// Configure the default options if undefined, and verify provided values are valid options.
	verifyConfiguration(config);
	duplicateRules.clear(); // Refresh duplicates
	missedRules.clear();	// Refresh duplicates
	
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
		warn(`Globbing resulted in files that did not end in .css:\n\t${invalidFiles.join(consoleListJoinString())}`);
	}

	if (missedRules.size > 0) 
	{
		let warnMessage = `The target directory: ${config.directory} had ${missedRules.size} unlayered css rules not parsed:`;
		if (config.debug) {

			// Get all the missedRule's selectors and display each on a new line.
			for (let [selector, location] of missedRules)
			{
				warnMessage += `\n\t${selector}`;
				warnMessage += "\n\t\t- "; // move to the next line to display a list of the file names
				warnMessage += Array.from(location.values()).join(consoleListJoinString(2))
			}
		}
		warn(warnMessage);
	}

	if (duplicateRules.size > 0) 
	{
		// Get all the duplicate rule selectors and display each on a new line.
		// displays like this
		/*
			{ selector }
				- { file1.css } - { count }
				- { file2.css } - { count }
		*/
		let debugMessage = "";
		// Count the total duplicates of each selector across each file.
		let duplicateRuleCount = 0;
		for (let [selector, stat] of duplicateRules)
		{
			debugMessage += `\n\t${selector}`;
			for (let [file, count] of stat)
			{
				debugMessage += `${consoleListJoinString(2)}${file} - ${count}`;
				duplicateRuleCount += count;
			}			
		}
		let warnMessage = `Found ${duplicateRuleCount} rules with selectors that were already used. Note, this only discovers duplicates in the TOP level of a layer or document--NOT nested styles. Also only shows duplicate counts of rules that would be added based on the configuration.`
		if (config.debug) {
			warnMessage += debugMessage;
		}
		warn(warnMessage);
	}

	// Now that all keyframes have been processed, add them to the rules that have animation-name declarations.
	assignKeyframesToRules();

	return {
		utilities: Array.from(utilities.values()),
		components: Array.from(components.values()),
	};
};
