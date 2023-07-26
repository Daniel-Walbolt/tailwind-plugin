import { Node } from 'postcss';

type LayerListObject = {
    utilities: (Node | Node[])[];
    components: (Node | Node[])[];
};
type LayerLocation = "File" | "Absolute" | "None";
type UnlayeredClassBehavior = "Ignore" | "Component" | "Utility";
type LayerParserConfig = {
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
};

/**
 * Resets the parsed utilities and components.
 *
 * Useful for parsing separate directories of css stylings for different tailwind configurations.
 *
 * Used by default by the plugin helper function.
 */
declare function resetData(): void;
declare function cssParser(config: LayerParserConfig): LayerListObject;

/**
 * Provides quick and easy usage of the cssParser provided by the tailwind-layer-parser plugin.
 * Adds parsed components and utilities to tailwind.
 *
 * Call this method in TailwindCSS's plugin()
 */
declare function ParseDirectory(config: LayerParserConfig): ({ addUtilities, addComponents, matchUtilities }: {
    addUtilities: any;
    addComponents: any;
    matchUtilities: any;
}) => void;

export { LayerListObject, LayerLocation, LayerParserConfig, ParseDirectory, UnlayeredClassBehavior, cssParser, resetData };
