const { ParseCSSDirectoryPlugin } = require('tailwind-layer-parser');
const plugin = require('tailwindcss');
/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './src/**/*.{js,ts,vue}'],
	theme: {
		extend: {},
	},
	plugins: [plugin(ParseCSSDirectoryPlugin('./css'))],
};
