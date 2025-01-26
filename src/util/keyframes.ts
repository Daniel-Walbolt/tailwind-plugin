/*
 * This file provides functions to handle parsing keyframes.
 * Keyframes and rules are processed separately, but need to be combined at the end of parsing if rules request keyframes.
 */

import {
	AtRule, Declaration, Result, Rule
} from 'postcss';
import {
	ComponentMap, MatchedKeyframeMap, MissedKeyframes, UtilityMap
} from '../cssParser';
import { LayerParserConfig, MatchedAnimationRule } from '../types';
import { convertAtRule, convertRule } from './nodeConverter';
import { getIdentifier } from './nodeFormatter';
import parseAnimationValue, { ParsedAnimation } from './animationParser';

// Store the processed keyframes
const keyframes: Map<string, AtRule> = new Map();

/**
 * Store the queue for keyframes requested by rules.
 * Each key is a rule identifier which stores the rule and the names of the keyframes it needs.
 * Keyframe name is parsed from animation or animation-name declarations
 */
const animationRuleQueue: Map<string, { rule: Rule, keyframes: Set<string>}> = new Map();

/**
 * Clear the saved keyframes and CSS rules.
 * 
 * Used every time before parsing the configured directories so there are no duplicates when adding rules to Tailwind.
 */
export function resetData() {
	keyframes.clear();
	animationRuleQueue.clear();
}

/**
 * Attempts to process the provided atRule as a keyframe.
 * @returns true if it was processed, false otherwise
 */
export function attemptToProcessKeyframe(atRule: AtRule, result: Result, config: LayerParserConfig): boolean {
	if (atRule.name === 'keyframes') {
		if (atRule.parent.type == "rule") {
			// This keyframe is nested within a rule.
			// Ignore processing this keyframe because it was intended to be hidden within this class.
			return false;
		}
		const atRuleIdentifier = getIdentifier(atRule);
		// Update the map with the newest keyframe
		keyframes.set(atRuleIdentifier, atRule);
		return true;
	}
	return false;
}

/**
 * Associates the parsed keyframes to the rules that reference them.
 * 
 * Populates {@link matchedKeyframes} and {@link missedKeyframes}
 * 
 * Should be called after all debugging of utilities and components
 */
export function matchKeyframesToRules(
	matchedKeyframes: MatchedKeyframeMap,
	components: ComponentMap,
	utilities: UtilityMap,
	missedKeyframes: MissedKeyframes,
	config: LayerParserConfig
) {
	// Loop through the rules that need keyframes
	for (const [ ruleIdentifier, ruleAndKeyframes ] of animationRuleQueue.entries()) {
		// Get the current rule that needs keyframes matched to it
		const rule = ruleAndKeyframes.rule;

		// Remove the components and utilities that reference this keyframe.
		// Only one instance of the keyframe should exist.
		components.delete(ruleIdentifier);
		utilities.delete(ruleIdentifier);

		const jsonStringifiedUtility = convertRule(rule, {}, false);

		// See if the user has defined a prefix for this animation rule
		const intellisensePrefix: string = config.animationPrefix;

		const matchedKeyframe: MatchedAnimationRule = new MatchedAnimationRule({
			node: rule,
			stringifiedNode: jsonStringifiedUtility
		}, intellisensePrefix);

		// Loop through each of the keyframes that this rule needs to be matched with
		for (const keyframeIdentifier of ruleAndKeyframes.keyframes) {
			// Attempt to get the keyframe from the list of found @keyframes
			const keyframe: AtRule | undefined = keyframes.get(keyframeIdentifier);

			if (keyframe == undefined) {
				// Track the keyframes that were requested, but were not found
				const missedKeyframeSet = missedKeyframes.get(keyframeIdentifier) ?? new Set();
				if (!missedKeyframeSet.has(rule.selector)) {
					missedKeyframeSet.add(rule.selector);
				}
				continue;
			}

			const jsonStringifiedMatch = convertAtRule(keyframe);

			matchedKeyframe.content.push({
				node: keyframe,
				stringifiedNode: jsonStringifiedMatch
			});
		}

		matchedKeyframes.set(ruleIdentifier, matchedKeyframe);
	}
}

/**
 * Check if the declaration references a keyframe, and if so, handle how to track it.
 * @returns true if the animation was registered
 */
export function registerAnimationDeclaration(declaration: Declaration, topParentRule: Rule): boolean {
	if (declaration.prop == 'animation') {
		const ruleIdentifier = getIdentifier(topParentRule);
		// Returns a list of objects
		const parseResult: Partial<ParsedAnimation>[] = parseAnimationValue(declaration.value);
		let addedAnimation = false;
		for (const parsedAnimationValue of parseResult) {
			const animationName = parsedAnimationValue.name;
			if (animationName == undefined) {
				continue;
			}

			// Get the object linking a rule to keyframes
			const ruleAndKeyframes = animationRuleQueue.get(ruleIdentifier) ?? { rule: topParentRule, keyframes: new Set<string>() };
			if (!ruleAndKeyframes.keyframes.has(animationName)) {
				// Add immediate parent to the list of keyframes this rule needs
				ruleAndKeyframes.keyframes.add(`@keyframes ${ animationName }`);
			}
			animationRuleQueue.set(ruleIdentifier, ruleAndKeyframes);
			addedAnimation = true;
		}
		return addedAnimation;
	} else if (declaration.prop == 'animation-name') {
		const ruleIdentifier = getIdentifier(topParentRule);
		const ruleAndKeyframes = animationRuleQueue.get(ruleIdentifier) ?? { rule: topParentRule, keyframes: new Set<string>() };
		if (!ruleAndKeyframes.keyframes.has(declaration.value)) {
			// Add this keyframe to the list this rule needs
			ruleAndKeyframes.keyframes.add(`@keyframes ${ declaration.value }`);
		}
		// This needs to match the identifier that gets put into the keyframes map.
		animationRuleQueue.set(ruleIdentifier, ruleAndKeyframes);
		return true;
	}

	return false;
}