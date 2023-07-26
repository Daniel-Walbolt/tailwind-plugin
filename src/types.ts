import { Node } from 'postcss';

export type LayerListObject = {
	utilities: (Node | Node[])[];
	components: (Node | Node[])[];
};

export type LayerLocation = "File" | "Absolute" | "None";
export type UnlayeredClassBehavior = "Ignore" | "Component" | "Utility";

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
};
