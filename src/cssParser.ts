import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss, {
	AtRule,
	Plugin,
	Result,
	Rule
} from 'postcss';
import {
	LayerParserConfig,
	LayerListObject,
	MatchedAnimationRule,
	StringifiedJSON
} from './types';
import {
	log,
	warn,
	error,
	consoleListJoinString
} from './util/logger';
import { globSync } from 'glob';
import * as Formatter from './util/nodeFormatter';
import * as Converter from './util/nodeConverter';

export type ComponentMap = Map<string, StringifiedJSON>;
export type UtilityMap = Map<string, StringifiedJSON>;
export type MatchedKeyframeMap = Map<string, MatchedAnimationRule>;

const utilities: UtilityMap = new Map();

export type MissedRules = Map<string, Set<string>>;
export type DuplicateRules = Map<string, Map<string, number>>;

// Re-evaluated on each run <selector, <location, count in location>>
const duplicateRules: DuplicateRules = new Map();
// Re-evaluated on each run. <selector, file names>
const missedRules: MissedRules = new Map();

/**
 * Check if the target rule has been processed.
 * 
 * If the rule has not been processed, marks it as processed.
 * 
 * Identifies rules that have matching selectors, rather than just the rule itself.
 */
function hasNotProcessedRule(node: Rule | AtRule, result: Result) {
	const ruleIdentifier = Formatter.getIdentifier(node);

	if (utilities.has(ruleIdentifier)) {
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
 * Processes CSS rules into their JSON versions
 */
function processRule(rule: Rule, result: Result) {
	// Ignore classes that are not immediate children of a layer
	if (rule.parent?.type === "atrule") {
		const atRuleParent = rule.parent as AtRule;
		if (atRuleParent.params !== "components" && atRuleParent.params !== "utilities") {
			// Ignore CSS rules that are not children of @layer components or @layer utilities
			return;
		}
	} else if (rule.parent?.type !== "root") {
		// Ignore classes that are not immediate children of the css file.
		return;
	}
	const ruleIdentifier = Formatter.getIdentifier(rule);
	if (hasNotProcessedRule(rule, result)) {
		const formattedNode = Converter.convertRule(rule, {}, true);
		utilities.set(ruleIdentifier, formattedNode);
	}
}

/** 
 * Function that returns the PostCSS plugin object.
 * Parses css file and performs validation and adjustments on rules.
 * Adds processed rules to arrays.
 */
function getParser(): (opts: any) => any {
	return () => {
		return {
			Rule(rule: Rule, { result }) {
				processRule(rule, result);
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

	config.debug ??= false;
	if (verifyBoolean(config.debug)) {
		warn("Invalid configuration for debug. Defaulting to false.");
		config.debug = false;
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
	if (utilities.size == 0) {
		log("Reset parsed components and utilities.");
	}
	utilities.clear();
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
					utilities: [],
				};
			}
		}
	}

	// Configure the default options if undefined, and verify provided values are valid options.
	verifyConfiguration(config);
	// Reset to avoid duplicates
	duplicateRules.clear();
	missedRules.clear();

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
		prepare: getParser(),
	};

	const invalidFiles = [];
	const processor = postcss([cssParser]);
	const parseFile: (fileName: string, fullPath: string) => void = (fileName: string, fullPath: string) => {
		const file = readFileSync(fullPath, 'utf8');
		processor.process(file, { from: fileName, to: fileName })
			// For some reason, .then() is required to make the processor work.
			.then();
	};

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

	return {
		utilities: Array.from(utilities.values())
	};
}