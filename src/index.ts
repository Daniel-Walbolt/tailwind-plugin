import cssParser from './cssParser';
export * from './types';

function ParseCSSDirectoryPlugin(directoryPath) {
	return (addUtilities, addComponents, e) => {
		const classes = cssParser({ directory: directoryPath });
		for (let utility of classes.utilities) {
			addUtilities(e(utility));
		}

		for (let component of classes.components) {
			addComponents(e(component));
		}
	};
}

export { cssParser, ParseCSSDirectoryPlugin };
