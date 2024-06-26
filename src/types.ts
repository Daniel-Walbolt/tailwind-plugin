import { AtRule, Node, Rule } from 'postcss';
import * as Formatter from './util/nodeFormatter';

export type LayerListObject = {
	utilities: Node[];
	components: Node[];
	keyframeUtilities: MatchedAnimationRule[]
};

export type LayerLocation = "File" | "Absolute" | "None";
export type UnlayeredClassBehavior = "Ignore" | "Component" | "Utility";
export type StringifiedJSON = {
    [key: string]: string | StringifiedJSON;
}

type MatchedAnimationRuleContent = {
	[intellisensePrefix: string]: (value: string) => (StringifiedJSON | { [key: string]: StringifiedJSON})[];
}

/**
 * Relates a rule to multiple other nodes for use in tailwind's matchUtilities() function
 * 
 * ```
 * matchUtilities(
 *		matchedUtility.getMatchedContent(),
 *		matchedUtility.getMatchedValues()
 * )
 * ```
 */
export class MatchedAnimationRule {
	content: MatchedNode<AtRule>[] = [];
	rule: MatchedNode<Rule>;
	intellisensePrefix: string;

	constructor (rule: MatchedNode<Rule>, intellisenseValue: string)
	{
		this.rule = rule;
		this.intellisensePrefix = intellisenseValue;
	}

	/** 
	 * Provides all the content for tailwind to process. Defines the suffix used in intellisense and provides the CSS styles.	
	 */
	getMatchedContent(): MatchedAnimationRuleContent
	{
		let matcher: MatchedAnimationRuleContent = {};
		let stringifiedMatches = this.content.map(x => x.stringifiedNode);
		let contentObject = Object.fromEntries(stringifiedMatches.entries());
		matcher[this.intellisensePrefix] = (value: string) => {
			return [
				contentObject,
				this.rule.stringifiedNode
			]
		}
		return matcher;
	};
	/** Provides the suffixes that CAN be used with the prefix.
	 * These suffixes can provide values that can manipulate the stylings, but this plugin doesn't support those yet.
	 * ```
	 * .{prefix}-{suffix}
	 * ```
	*/
	getMatchedValues(): { values: {[intellisenseSuffix: string]: string} }
	{
		let suffixes: { [key: string]: string } = {};
		// Get the identifier of the rule, and select all the word characters and dashes. If multiple words are matched in the identifier (i.e. .sample,.test -> sample-test)
		let identifier = Formatter.getIdentifier(this.rule.node).match(/\w+/g).join("-");
		suffixes[identifier] = '';
		return {
			values: suffixes
		};
	}
}

/** Stores a PostCSS node along with the stringifiedJson version of it. */
export type MatchedNode<T> = {
	node: T,
	/** The stringified version of the node that is friendly for use with tailwind's matchUtilities() */
	stringifiedNode: StringifiedJSON
}

export type LayerParserConfig = {
	/**
	 * The path of the directory that you want to be added.
	 *
	 * Defaults to the current working directory using Node:path library.
	 */
	directory?: string;

	/**
	 * Should this plugin parse classes that aren't in a component or utilities layer?
	 * 
	 * Defaults to Utility
	 * @param Ignore Do not add classes that do not belong to a tailwind layer.
	 * @param Component Parse classes without a tailwind layer as components.
	 * @param Utility Parse classes without a tailwind layer as utilities.
	 */
	unlayeredClassBehavior?: UnlayeredClassBehavior;

	/**
	 * Specify your own glob patterns to match css files.
	 *
	 * This plugin only accepts files ending in .css files, and will print out the files that don't end with .css.
	 *
	 * By default matches all .css files in provided directory and any nested directories.
	 */
	globPatterns?: string[];

	/**
	 * Enable debug mode on this plugin so that you can see the file paths that are globbed.
	 */
	debug?: boolean;

	/**
	 * Determines the specificity of the comment above each rule.
	 * 
	 * Helps to identify where the css styling comes from.
	 * 
	 * Defaults to "File."
	 */
	commentType?: LayerLocation;

	/**
	 * Should the opening bracket for styles appear on the next line?
	 */
	openBracketNewLine: boolean;

	/**
	 * The prefix to use for matching keyframes to rules. Due to the way tailwind expects plugins to group keyframes with rules, it requires a {prefix}-{suffix} combination.
	 * 
	 * The suffix will always be the name of the TOP MOST rule referencing keyframes.
	 * 
	 * This property defines the prefix, can NOT be undefined or blank. Defaults to "animate", just like tailwind's other animate classes (i.e. ```animate-ping```).
	 */
	animationPrefix: string;
};
