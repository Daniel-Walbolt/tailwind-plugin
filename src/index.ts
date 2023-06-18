import cssParser from './cssParser';
import { LayerParserConfig } from './types';
export * from './types';
import { watch } from 'fs';

/**
 * Provides quick and easy usage of the cssParser provided by the tailwind-layer-parser plugin. Call this method in TailwindCSS's plugin()
 *
 * Uses the default configuration.
 */
function ParseCSSDirectoryPlugin(config: LayerParserConfig) 
{
	return ({ addUtilities, addComponents }) => 
	{
		const classes = cssParser(config);

		for (const utility of classes.utilities) 
		{
			addUtilities(utility);
		}

		for (const component of classes.components) 
		{
			addComponents(component);
		}
	};
}

export { cssParser, ParseCSSDirectoryPlugin };
