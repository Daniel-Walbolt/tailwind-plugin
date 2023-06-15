var cssParser = require('./cssParser');
function ParseCSSDirectoryPlugin(directoryPath) {
    return function (addUtilities, addComponents, e) {
        var classes = cssParser(directoryPath);
        for (var _i = 0, _a = classes.utilities; _i < _a.length; _i++) {
            var utility = _a[_i];
            addUtilities(e(utility));
        }
        for (var _b = 0, _c = classes.components; _b < _c.length; _b++) {
            var component = _c[_b];
            addComponents(e(component));
        }
    };
}
module.exports = {
    cssParser: cssParser,
    ParseCSSDirectoryPlugin: ParseCSSDirectoryPlugin,
};
