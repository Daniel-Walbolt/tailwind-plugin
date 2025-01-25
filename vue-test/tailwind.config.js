import plugin from "tailwindcss/plugin";
import { ParseCSS } from "tailwind-layer-parser";

export default {
	plugins: [
		plugin(
			ParseCSS({
				directory: `${__dirname}/css`,
				debug: true
			})
		)
	]
};