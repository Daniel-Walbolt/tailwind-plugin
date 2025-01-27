import { AtRule, Declaration, Rule } from "postcss";
import { StringifiedJSON } from "../types";

/** Converts a declaration and adds it to the provided object. Returns the modified object. */
export function convertDeclaration (declaration: Declaration, formattedObject: StringifiedJSON = {}): StringifiedJSON {
	if (declaration.type === 'decl') {
		formattedObject[declaration.prop] = declaration.value;
	}

	return formattedObject;
}

/** Converts a rule and its nested rules into stringified JSON for compatibility with TailwindCSS config syntax */
export function convertRule (
	rule: Rule,
	/** 
	 * True: the rule provided is added to the formattedObject using its selector.
	 * 
	 * False: returns the rule converted into an object ONLY. Not added to the provided object. Essentially means there is no key value.
	 */
	formattedObject: StringifiedJSON = {},
	includeRuleSelector = true,
): StringifiedJSON {
	if (rule.type === 'rule') {
		let convertedRule: StringifiedJSON = {};

		for (const node of rule.nodes) {
			if (node.type === 'decl') {
				convertedRule = convertDeclaration(node, convertedRule);
			} else if (node.type === 'rule') {
				convertedRule = convertRule(node, convertedRule);
			} else if (node.type === 'atrule') {
				convertedRule = convertAtRule(node, convertedRule);
			}
		}
		if (includeRuleSelector) {
			formattedObject[rule.selector] = convertedRule;
		} else {
			return convertedRule;
		}

		return formattedObject;
	}
}

export function convertAtRule (atRule: AtRule, formattedObject: StringifiedJSON = {}): StringifiedJSON {
	if (atRule.type === 'atrule') {
		let convertedAtRule: StringifiedJSON = {};

		// Check that the AtRule has nodes that can be iterated over.
		// e.g. @apply does NOT have iterable nodes.
		if (atRule.nodes?.[Symbol.iterator]) {
			for (const node of atRule.nodes) {
				if (node.type === 'decl') {
					convertedAtRule = convertDeclaration(node, convertedAtRule);
				} else if (node.type === 'rule') {
					convertedAtRule = convertRule(node, convertedAtRule);
				} else if (node.type === 'atrule') {
					// Don't know why an atrule would be in another atrule...
					convertedAtRule = convertAtRule(node, convertedAtRule);
				}
			}
		}
		formattedObject[`@${ atRule.name } ${ atRule.params }`] = convertedAtRule;

		return formattedObject;
	}
}