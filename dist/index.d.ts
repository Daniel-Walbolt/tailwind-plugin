import { AtRule, Rule } from 'postcss';

type LayerListObject = {
    utilities: StringifiedJSON[];
};
type LayerLocation = "File" | "Absolute" | "None";
type UnlayeredClassBehavior = "Ignore" | "Component" | "Utility";
type StringifiedJSON = {
    [key: string]: string | StringifiedJSON;
};
type MatchedAnimationRuleContent = {
    [intellisensePrefix: string]: (value: string) => (StringifiedJSON | {
        [key: string]: StringifiedJSON;
    })[];
};
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
declare class MatchedAnimationRule {
    content: MatchedNode<AtRule>[];
    rule: MatchedNode<Rule>;
    intellisensePrefix: string;
    constructor(rule: MatchedNode<Rule>, intellisenseValue: string);
    /**
     * Provides all the content for tailwind to process. Defines the suffix used in intellisense and provides the CSS styles.
     */
    getMatchedContent(): MatchedAnimationRuleContent;
    /** Provides the suffixes that CAN be used with the prefix.
     * These suffixes can provide values that can manipulate the stylings, but this plugin doesn't support those yet.
     * ```
     * .{prefix}-{suffix}
     * ```
    */
    getMatchedValues(): {
        values: {
            [intellisenseSuffix: string]: string;
        };
    };
}
/** Stores a PostCSS node along with the stringifiedJson version of it. */
type MatchedNode<T> = {
    node: T;
    /** The stringified version of the node that is friendly for use with tailwind's matchUtilities() */
    stringifiedNode: StringifiedJSON;
};
type LayerParserConfig = {
    /**
     * The path of the directory that you want to be added.
     *
     * Defaults to the current working directory using Node:path library.
     */
    directory?: string;
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
     * The prefix to use for matching keyframes to rules.
     * Due to the way tailwind expects plugins to group keyframes with rules, it requires a {prefix}-{suffix} combination.
     *
     * The suffix will always be the name of the TOP MOST rule referencing keyframes.
     *
     * This property defines the prefix, and can NOT be undefined or blank.
     * Defaults to "animate", just like tailwind's other animate classes (i.e. ```animate-ping```).
     */
    animationPrefix: string;
};

/**
 * Resets the parsed utilities and components.
 *
 * Useful for parsing separate directories of CSS for more than one tailwind configuration.
 * By default, all references to this plugin will store the same data.
 *
 * Used by default by the plugin helper function.
 */
declare function resetData(): void;
declare function CSSParser(config: LayerParserConfig): LayerListObject;

/**
 * Provides quick and easy usage of the CSSParser provided by the tailwind-layer-parser plugin.
 * Adds parsed components and utilities to tailwind.
 *
 * Call this method in TailwindCSS's plugin()
 */
declare function ParseCSS(config: LayerParserConfig): ({ addUtilities }: {
    addUtilities: any;
}) => void;

export { LayerListObject, LayerLocation, LayerParserConfig, MatchedAnimationRule, MatchedNode, ParseCSS, StringifiedJSON, UnlayeredClassBehavior, CSSParser as cssParser, resetData };
