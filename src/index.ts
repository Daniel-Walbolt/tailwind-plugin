import { LayerParserConfig } from './types';
export * from './types';
import { resetData, CSSParser } from './cssParser';

/**
 * Provides quick and easy usage of the CSSParser provided by the tailwind-layer-parser plugin. 
 * Adds parsed components and utilities to tailwind.
 * 
 * Call this method in TailwindCSS's plugin()
 */
function ParseCSS(config: LayerParserConfig) {
	return ({ addUtilities, addComponents, matchUtilities }) => {
		resetData();
		const classes = CSSParser(config);

		for (const utility of classes.utilities) {
			addUtilities(utility);
		}

		for (const component of classes.components) {
			addComponents(component);
		}

		for (const matchedKeyframe of classes.keyframeUtilities) {
			matchUtilities(
				matchedKeyframe.getMatchedContent(),
				matchedKeyframe.getMatchedValues()
			);
		}
	};
}

export { resetData, CSSParser as cssParser, ParseCSS };
