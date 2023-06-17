import cssParser from './cssParser';
export * from './types';

/**
 * Provides quick and easy usage of the cssParser provided by the tailwind-layer-parser plugin. Call this method in TailwindCSS's plugin()
 *
 * Uses the default configuration.
 */
function ParseCSSDirectoryPlugin(directoryPath?: string) 
{
	return ({ addUtilities, addComponents, e }) => 
	{
		const classes = cssParser({ directory: directoryPath, addClassesWithoutLayerAsUtilities: true });
		for (const utility of classes.utilities) 
		{
			addUtilities(e(utility));
		}

		for (const component of classes.components) 
		{
			addComponents(e(component));
		}
	};
}

export { cssParser, ParseCSSDirectoryPlugin };
