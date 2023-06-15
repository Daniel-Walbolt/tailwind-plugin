import { Node } from 'postcss';

type LayerListObject = {
    utilities: Node[];
    components: Node[];
};
type LayerParserConfig = {
    /**
     * The path of the directory that you want to be added.
     *
     * By default ignores nested directories, only parsing .css files in the directory given.
     */
    directory: string;
    /**
     * Should this plugin parse classes that aren't in a component or utilities layer?
     *
     * @param true Parse classes without layers as utilities
     * @param false Parse classes that don't have classes as components.
     * @param undefined Do not add classes that do not belong to a tailwind layer.
     */
    addClassesWithoutLayerAsUtilities?: boolean;
    /**
     * Should this plugin parse files that are in nested directories?
     *
     * Defaults to TRUE
     */
    parseNestedDirectories?: boolean;
};

declare const _default: (config: LayerParserConfig) => LayerListObject;

declare function ParseCSSDirectoryPlugin(directoryPath: any): (addUtilities: any, addComponents: any, e: any) => void;

export { LayerListObject, LayerParserConfig, ParseCSSDirectoryPlugin, _default as cssParser };
