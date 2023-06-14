const cssParser = require('./cssParser');

function ParseCSSDirectoryPlugin(directoryPath) {
	return (addUtilities, addComponents, e) => {
		const classes = cssParser(directoryPath);
		for (let utility of classes.utilities) {
			addUtilities(e(utility));
		}

		for (let component of classes.components) {
			addComponents(e(component));
		}
	};
}

module.exports = {
	cssParser,
	ParseCSSDirectoryPlugin,
};
