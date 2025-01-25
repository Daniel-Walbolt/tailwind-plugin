import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss, {
	AtRule,
	Node,
	Plugin,
	Result,
	Rule
} from 'postcss';
import {
	LayerParserConfig,
	LayerListObject,
	MatchedAnimationRule,
	FormattedRule
} from './types';
import {
	log,
	warn,
	error,
	consoleListJoinString
} from './util/logger';
import { globSync } from 'glob';
import * as Keyframes from './util/keyframes';
import * as Formatter from './util/nodeFormatter';

export type ComponentMap = Map<string, FormattedRule>;
export type UtilityMap = Map<string, FormattedRule>;
export type MatchedKeyframeMap = Map<string, MatchedAnimationRule>;

const components: ComponentMap = new Map();
const utilities: UtilityMap = new Map();
const matchedKeyframes: MatchedKeyframeMap = new Map();

export type MissedKeyframes = Map<string, Set<string>>;
export type MissedRules = Map<string, Set<string>>;
export type DuplicateRules = Map<string, Map<string, number>>;

// Re-evaluated on each run <selector, <location, count in location>>
const duplicateRules: DuplicateRules = new Map();
// Re-evaluated on each run. <selector, file names>
const missedRules: MissedRules = new Map();
// Re-evaluated on each run. <keyframe identifier, list of rules identifiers that missed it>>
const missedKeyframes: MissedKeyframes = new Map();

/**
 * Check if the target rule has been processed.
 * 
 * If the rule has not been processed, marks it as processed.
 * 
 * Identifies rules that have matching selectors, rather than just the rule itself.
 */
function hasNotProcessedRule(node: Rule | AtRule, result: Result) {
	const ruleIdentifier = Formatter.getIdentifier(node);

	if (utilities.has(ruleIdentifier) || components.has(ruleIdentifier)) {
		const nodeStatistic: Map<string, number> = duplicateRules.get(ruleIdentifier);
		if (nodeStatistic) {
			const nodeFileCount: number = nodeStatistic?.get(result.opts.from);
			if (nodeFileCount) {
				// If the node was already found in this file, increment its count
				nodeStatistic.set(result.opts.from, nodeFileCount + 1);
			} else {
				nodeStatistic.set(result.opts.from, 1);
			}
		} else {
			// The node was not already found in this file, create a new entry in the map.
			duplicateRules.set(ruleIdentifier, new Map([[ result.opts.from, 1 ]]));
		}
		return false;
	}

	return true;
}

/**
 * Processes rules or atrules into the component or utiltity lists based on their parent layers.
 */
function processRule(rule: Rule, result: Result, config: LayerParserConfig) {
	const ruleIdentifier = Formatter.getIdentifier(rule);

	// Check if the rule is at the base-level of the css file.
	if (rule.parent?.type === 'root') {
		if (hasNotProcessedRule(rule, result)) {
			if (config.unlayeredClassBehavior === "Ignore") {
				const files: Set<string> = missedRules.get(ruleIdentifier) ?? new Set();
				files.add(result.opts.from as string);
				missedRules.set(ruleIdentifier, files);
				return;
			}

			Formatter.formatNode(rule, config, result, rule);
			if (config.unlayeredClassBehavior === "Utility") {
				utilities.set(ruleIdentifier, rule);
			} else if (config.unlayeredClassBehavior === "Component") {
				components.set(ruleIdentifier, rule);
			}
		}
	} else if (rule.parent?.type == 'atrule') {
		// Otherwise check if the at rule exists in a layer
		if (hasNotProcessedRule(rule, result)) {
			const atRuleParent: AtRule = rule.parent as AtRule;
			// This rule is in an at rule, check whether it's a component or utility layer
			if (atRuleParent.params === 'components') {
				Formatter.formatNode(rule, config, result, rule);
				components.set(ruleIdentifier, rule);
			} else if (atRuleParent.params === 'utilities') {
				Formatter.formatNode(rule, config, result, rule);
				utilities.set(ruleIdentifier, rule);
			}
		}
	}
}

function processAtRule(atRule: AtRule, result: Result, config: LayerParserConfig) {
	Keyframes.attemptToProcessKeyframe(atRule, result, config);
}

/**
 * Get the top-most parent rule of the given node.
 */
function getTopRule(node: Node, config: LayerParserConfig) {
	let nextParent = node.parent;
	let parent = node;
	let isTopParent = false;
	// Continue getting the node's parent until the parent's type is 'root'
	while (!isTopParent && nextParent != null) {
		if (nextParent.type === 'root') {
			if (parent.type == 'rule') {
				// If the current parent is a rule and the next parent is the root, that means there is no layer.
				// Check if the user wants unlayed rules to be added.
				if (config.unlayeredClassBehavior == "Ignore") {
					return null;
				}
				isTopParent = true;
				continue;
			}
		} else if (nextParent.type === 'atrule') {
			const atRuleParent = nextParent as AtRule;

			if (atRuleParent.name !== 'layer') {
				continue;
			}

			if (atRuleParent.params === 'components' || atRuleParent.params === 'utilities') {
				// The parent is @layer components or @layer utilities
				isTopParent = true;
				continue;
			}
		}

		// Move to the next parent
		parent = nextParent;
		nextParent = nextParent.parent;
	}
	return parent;
}

/** 
 * Function that returns the PostCSS plugin object.
 * Parses css file and performs validation and adjustments on rules.
 * Adds processed rules to arrays.
 */
function getParser(config: LayerParserConfig): (opts: any) => any {
	return () => {
		return {
			Rule(rule: Rule, { result }) {
				processRule(rule, result, config);
			},
			AtRule:
			{
				keyframes: (atRule: AtRule, { result }) => {
					processAtRule(atRule, result, config);
				}
			}
		};
	};
}

/**
 * Verify the configuration provided uses the values defined by typescript.
 * 
 * If not, defaults the value.
 */
function verifyConfiguration(config: LayerParserConfig) {
	const verifyBoolean = (bool: boolean) => bool !== true && bool !== false;

	if (config.directory == undefined) {
		warn('There was no directory provided. Defaulting to process.cwd().');
		config.directory = process.cwd();
	}

	config.commentType ??= "File";
	if (config.commentType !== "File" && config.commentType != "Absolute" && config.commentType != "None") {
		warn("Invalid configuration for commentType. Defaulting to 'File'");
		config.commentType = "File";
	}

	config.debug ??= false;
	if (verifyBoolean(config.debug)) {
		warn("Invalid configuration for debug. Defaulting to false.");
		config.debug = false;
	}

	config.unlayeredClassBehavior ??= "Utility";
	if (config.unlayeredClassBehavior !== "Utility"
		&& config.unlayeredClassBehavior !== "Component"
		&& config.unlayeredClassBehavior !== "Ignore"
	) {
		// User has forcefully input class behavior other than the provided type.
		warn("Invalid configuration for unlayedClassBehavior. Defaulting to Utility");
		config.unlayeredClassBehavior = "Utility";
	}

	config.globPatterns ??= ['**/*.css'];

	if (config.animationPrefix == undefined || config.animationPrefix.trim().length == 0) {
		config.animationPrefix = "animate";
	}
}

/**
 * Resets the parsed utilities and components.
 * 
 * Useful for parsing separate directories of CSS for more than one tailwind configuration.
 * By default, all references to this plugin will store the same data.
 * 
 * Used by default by the plugin helper function.
 */
export function resetData() {
	if (components.size == 0 && utilities.size == 0) {
		log("Reset parsed components and utilities.");
	}
	components.clear();
	utilities.clear();
	matchedKeyframes.clear();
	Keyframes.resetData();
}

export function CSSParser(config: LayerParserConfig): LayerListObject {
	if (config.globPatterns != undefined && config.globPatterns.length > 0) {
		for (const pattern of config.globPatterns) {
			if (pattern.startsWith('/**')) {
				error(`
					User attempted to glob their entire computer using: ${ pattern }.
					This would result in a serious performance problem, and thus parsing has been skipped.
				`);
				return {
					components: [],
					utilities: [],
					keyframeUtilities: []
				};
			}
		}
	}

	// Configure the default options if undefined, and verify provided values are valid options.
	verifyConfiguration(config);
	// Reset to avoid duplicates
	duplicateRules.clear();
	missedRules.clear();
	missedKeyframes.clear();

	// Resolve the directory provided by the user
	const resolvedDirectory = resolve(config.directory);

	let result: string[] = [];
	result = globSync(config.globPatterns, {
		cwd: resolvedDirectory,
	});

	if (config.debug) {
		log(`Searched directories: ${ resolvedDirectory }`);
		log(`Found: ${ result.join('\t') }`);
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
			parseFile = (_: string, fullPath: string) => {
				const file = readFileSync(fullPath, 'utf8');
				processor.process(file, { from: fullPath, to: fullPath })
					// For some reason, .then() is required to make the processor work.
					.then();
			};
			break;
		default:
			parseFile = (fileName: string, fullPath: string) => {
				const file = readFileSync(fullPath, 'utf8');
				processor.process(file, { from: fileName, to: fileName })
					// For some reason, .then() is required to make the processor work.
					.then();
			};
			break;
	}

	for (const fileName of result) {
		if (!fileName.endsWith('.css')) {
			invalidFiles.push(fileName);
			continue;
		}
		const fullPath = resolve(resolvedDirectory, fileName);
		parseFile(fileName, fullPath);
	}

	if (invalidFiles.length > 0) {
		warn(`Globbing resulted in files that did not end in .css:\n\t${ invalidFiles.join(consoleListJoinString()) }`);
	}

	if (missedRules.size > 0) {
		let warnMessage = `The target directory: ${ config.directory } had ${ missedRules.size } unlayered css rules not parsed:`;
		if (config.debug) {
			// Get all the missedRule's selectors and display each on a new line.
			for (const [ selector, location ] of missedRules) {
				warnMessage += `\n\t${ selector }`;
				// move to the next line to display a list of the file names
				warnMessage += "\n\t\t- ";
				warnMessage += Array.from(location.values()).join(consoleListJoinString(2));
			}
		}
		warn(warnMessage);
	}

	if (duplicateRules.size > 0) {
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
		for (const [ selector, stat ] of duplicateRules) {
			debugMessage += `\n\t${ selector }`;
			for (const [ file, count ] of stat) {
				debugMessage += `${ consoleListJoinString(2) }${ file } - ${ count }`;
				duplicateRuleCount += count;
			}
		}
		let warnMessage = `Found ${ duplicateRuleCount } rules with selectors that were already used.
			Note, this only discovers root-level (not nested) duplicates that would be added based on the configuration.`;
		if (config.debug) {
			warnMessage += debugMessage;
		}
		warn(warnMessage);
	}

	// Now that all keyframes have been processed, add them to the rules that have animations defined
	Keyframes.matchKeyframesToRules(matchedKeyframes, components, utilities, missedKeyframes, config);

	if (missedKeyframes.size > 0) {
		let debugMessage = "";
		let missedKeyframeCount = 0;
		for (const [ keyframeIdentifier, ruleSelectors ] of missedKeyframes) {
			debugMessage += `\n\t${ keyframeIdentifier }`;
			missedKeyframeCount += ruleSelectors.size;
			for (const rule of ruleSelectors) {
				debugMessage += `${ consoleListJoinString(2) }${ rule }`;
			}
		}
		let warnMessage = `Could not find ${ missedKeyframeCount } keyframes that were referenced by the searched CSS files.`;
		if (config.debug) {
			warnMessage += debugMessage;
		}
		warn(warnMessage);
	}

	return {
		utilities: Array.from(utilities.values()),
		components: Array.from(components.values()),
		keyframeUtilities: Array.from(matchedKeyframes.values())
	};
}
