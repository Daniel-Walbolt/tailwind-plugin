import { Node } from 'postcss';

type LayerListObject = {
    utilities: Node[];
    components: Node[];
};
type LayerParserConfig = {
    /**
     * The path of the directory that you want to be added.
     *
     *
     * Defaults to the current working directory using Node:path library.
     */
    directory?: string;
    /**
     * Should this plugin parse classes that aren't in a component or utilities layer?
     *
     * @param true Parse classes without a tailwind layer as utilities
     * @param false Parse classes without a tailwind layer as components.
     * @param undefined Do not add classes that do not belong to a tailwind layer.
     */
    addClassesWithoutLayerAsUtilities?: boolean;
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
};

declare const _default: (config: LayerParserConfig) => LayerListObject;

/**
 * Provides quick and easy usage of the cssParser provided by the tailwind-layer-parser plugin. Call this method in TailwindCSS's plugin()
 *
 * Uses the default configuration.
 */
declare function ParseCSSDirectoryPlugin(directoryPath?: string): (addUtilities: any, addComponents: any) => void;

export { LayerListObject, LayerParserConfig, ParseCSSDirectoryPlugin, _default as cssParser };
