/*
 * This file provides functions to format nodes.
 */
import { AtRule, Rule } from "postcss";

/**
 * Gets the identifier for a rule or atrule.
 */
export function getIdentifier(node: Rule | AtRule) {
	let ruleIdentifier = "";
	if (node.type == 'rule') {
		node = node as Rule;
		ruleIdentifier = node.selector;
	}
	return ruleIdentifier;
}