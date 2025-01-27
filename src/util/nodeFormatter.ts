/*
 * This file provides functions to format nodes.
 */

import { AtRule, Result, Rule } from "postcss";
import * as Keyframes from "./keyframes";
import { LayerParserConfig, StringifiedJSON } from "../types";

/**
 * Gets the identifier for a rule or atrule.
 */
export function getIdentifier(node: Rule | AtRule) {
	let ruleIdentifier = "";
	if (node.type == 'rule') {
		node = node as Rule;
		ruleIdentifier = node.selector;
	} else if (node.type == 'atrule') {
		node = node as AtRule;
		ruleIdentifier = `@${ node.name } ${ node.params }`;
	}
	return ruleIdentifier;
}

/**
 * Function for manipulating everything on a rule and its nested rules.
 *
 * Fixes the indentation from being in layers.
 * 
 * Searches each rule to find animations, so that the parser can MATCH them to the parent rule.
 *
 * Adds a comment to the parent rule to distinguish what file it comes from.
 *
 * Recursively calls itself to fix nested rules.
 */
export function formatNode(
	node: Rule | AtRule,
	config: LayerParserConfig,
	result: Result,
	originalParentRule?: Rule,
	nesting = 1
) {
	if (node.nodes == undefined || node.nodes.length == 0) {
		return;
	}

	// The indent for inside the node's curly braces
	let innerIndent = '';

	// The indent for multi-line selectors.
	let selectorIndents = '';

	//#region define the indents based on the nesting level
	for (let i = 0; i < nesting; i++) {
		innerIndent += '\t';
		if (i < nesting - 1) {
			selectorIndents += '\t';
		}
	}
	//#endregion

	//#region Format the selectors for rules and parameters for AtRules
	let selector: string | undefined = undefined;

	if (node.type === 'rule') {
		const rule = node as Rule;
		// Format the selectors to each appear on their own line.
		selector = rule.selectors.join(`,\n${ selectorIndents }`);
	} else if (node.type == 'atrule') {
		const atRule = node as AtRule;
		atRule.params = atRule.params.trim();
		atRule.raws.afterName = ' ';
		selector = `${ atRule.name }${ atRule.params.trim() }`;
	}
	//#endregion

	//#region Format the nodes within this node recursively. Declarations don't have any nested nodes.
	for (const child of node.nodes) {
		if (child.type == 'decl') {
			if (originalParentRule.type == 'rule') {
				Keyframes.registerAnimationDeclaration(child, originalParentRule);
			}
		}
		child.raws.before = '\n' + innerIndent;
		child.raws.after = '\n' + innerIndent;
		formatNode(child as Rule, config, result, originalParentRule, nesting + 1);
	}
	//#endregion

	//#region Add comment and spacing to node if it's in the first layer of nesting
	// if (nesting == 1) {
	// 	node.raws.before = '\n';
	// 	if (config.commentType !== "None") {
	// 		node.raws.before += `/* From ${ result.opts.from } */\n`;
	// 	}
	// 	node.raws.after = '\n';
	// }
	//#endregion
}