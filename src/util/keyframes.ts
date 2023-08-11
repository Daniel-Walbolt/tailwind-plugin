/*
 * This file provides functions to handle parsing keyframes.
 * Keyframes and rules are processed separately, but neeed to be combined at the end of parsing if rules request keyframes.
 */

import { AtRule, Declaration, Result, Rule } from 'postcss';
import { ComponentMap, MatchedKeyframeMap, MissedKeyframes, UtilityMap } from '../cssParser';
import { LayerParserConfig, MatchedUtility } from '../types';
import { convertAtRule, convertRule } from './nodeConverter';
import { getIdentifier } from './nodeFormatter';
import parseAnimationValue, { ParsedAnimation } from './animationParser';

// Store the processed keyframes
const keyframes: Map<string, AtRule> = new Map();

// Store the queue for keyframes requested by rules. Each key is a rule identifier which stores the rule and the names of the keyframes it needs.
// Keyframe name is parsed from animation or animation-name declarations
const animationRuleQueue: Map<string, { rule: Rule, keyframes: Set<string>}> = new Map();

export function resetData()
{
    keyframes.clear();
    animationRuleQueue.clear();
}

/**
 * Attempts to process the provided atRule as a keyframe.
 * @returns true if it was processed, false otherwise
 */
export function attemptToProcessKeyframe(atRule: AtRule, result: Result, config: LayerParserConfig): boolean
{
    if (atRule.name = 'keyframes')
    {
        let atRuleIdentifier = getIdentifier(atRule);
        keyframes.set(atRuleIdentifier, atRule); // Update the map with the newest keyframe
        return true;
    }
    return false;
}

/**
 * Loop through the rules that need keyframes added alongside them.
 * 
 * Populates {@link matchedKeyframes} and {@link missedKeyframes}
 * 
 * Should be called after all debugging of utilities and components
 */
export function matchKeyframesToRules(matchedKeyframes: MatchedKeyframeMap, components: ComponentMap, utilities: UtilityMap, missedKeyframes: MissedKeyframes, config: LayerParserConfig)
{
	// Loop through the rules that need keyframes
	for (const [ruleIdentifier, ruleAndKeyframes] of animationRuleQueue.entries())
	{

		// Get the current rule that needs keyframes matched to it
		const rule = ruleAndKeyframes.rule;

		// Remove the component / utility
		components.delete(ruleIdentifier);
		utilities.delete(ruleIdentifier);

		const jsonStringifiedUtility = convertRule(rule, {}, false);
		
		// See if the user has defined a name for this animation rule
		let intellisensePrefix: string = config.animationPrefix;
		// rule.walkDecls(config.animationDeclarationName, decl => {
		// 	if (decl != undefined)
		// 	{
		// 		// decl.value is what will appear in intellisense.
		// 		intellisensePrefix = decl.value;
		// 	}
		// 	decl.remove();
		// })

		// if (Object.entries(intellisensePrefix).length == 0)
		// {
		// 	let identifier = ruleIdentifier.match(/\w+-?/g).join("-");
		// 	// The rule identifier is what will appear in intellisense.
		// 	intellisensePrefix = identifier;
		// }

		const matchedKeyframe: MatchedUtility = new MatchedUtility({
			node: rule,
			stringifiedNode: jsonStringifiedUtility
		}, intellisensePrefix);

		// Loop through each of the keyframes that this rule needs to be matched with
		for (const keyframeIdentifier of ruleAndKeyframes.keyframes)
		{
			// Attempt to get the keyframe from the list of found @keyframes
			let keyframe: AtRule | undefined = keyframes.get(keyframeIdentifier);
			
			if (keyframe == undefined)
			{
				// Track the keyframes that were requested, but were not found
				let missedKeyframeSet = missedKeyframes.get(keyframeIdentifier) ?? new Set()
				if (!missedKeyframeSet.has(rule.selector))
				{
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
export function registerAnimationDeclaration(declaration: Declaration, topParentRule: Rule): boolean
{
	if (declaration.prop == 'animation')
	{
		const ruleIdentifier = getIdentifier(topParentRule);
		const parseResult: Partial<ParsedAnimation>[] = parseAnimationValue(declaration.value);  // Returns a list of objects
		let addedAnimation = false;
		for (let parsedAnimationValue of parseResult)
		{
			const animationName = parsedAnimationValue.name
			if (animationName == undefined)
			{
				continue;
			}

			// Get the object linking a rule to keyframes
			const ruleAndKeyframes = animationRuleQueue.get(ruleIdentifier) ?? { rule: topParentRule, keyframes: new Set<string>() }
			if (!ruleAndKeyframes.keyframes.has(animationName))
			{
				ruleAndKeyframes.keyframes.add(`@keyframes ${animationName}`); // Add immediate parent to the list of keyframes this rule needs
			}
			animationRuleQueue.set(ruleIdentifier, ruleAndKeyframes);
			addedAnimation = true;
		}
		return addedAnimation;
	}
	else if (declaration.prop == 'animation-name')
	{
		const ruleIdentifier = getIdentifier(topParentRule);
		const ruleAndKeyframes = animationRuleQueue.get(ruleIdentifier) ?? { rule: topParentRule, keyframes: new Set<string>() }
		if (!ruleAndKeyframes.keyframes.has(declaration.value))
		{
			ruleAndKeyframes.keyframes.add(`@keyframes ${declaration.value}`); // Add this keyframe to the list this rule needs
		}
		animationRuleQueue.set(ruleIdentifier, ruleAndKeyframes); // This needs to match the identifier that gets put into the keyframes map.	
		return true;		
	}
	
	return false;
}