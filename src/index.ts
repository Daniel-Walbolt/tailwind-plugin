import { LayerParserConfig } from './types';
export * from './types';
import { resetData, cssParser } from './cssParser';

/**
 * Provides quick and easy usage of the cssParser provided by the tailwind-layer-parser plugin. 
 * Adds parsed components and utilities to tailwind.
 * 
 * Call this method in TailwindCSS's plugin()
 */
function ParseDirectory(config: LayerParserConfig) 
{
	return ({ addUtilities, addComponents, matchUtilities }) => 
	{
		resetData();
		const classes = cssParser(config);

		for (const utility of classes.utilities) 
		{
			addUtilities(utility);
		}

		for (const component of classes.components) 
		{
			addComponents(component);
		}

		// matchUtilities(
		// {
		// 	animate: (value) => {
		// 		return [
		// 			{
		// 				'@keyframes test-animation':
		// 				{
		// 					'50%': {
		// 						'background-color': 'red'
		// 					}
		// 				}
		// 			},
		// 			{
		// 				animation: 'test-animation 1s ease infinite'
		// 			}
		// 		];
		// 	}
		// },
		// {
		// 	values: { 'test-animation': ''}
		// });
		addUtilities(
			{
				'keyframes test-animation':
				{
					'50%': {
						'background-color': 'red'
					}	
				},
				'test-animation': {
					'animation': 'test-animation 1s ease infinite'
				}
			}
		)
	};
}

export { resetData, cssParser, ParseDirectory};
