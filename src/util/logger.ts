/*
*  This file provides functions to display messages to the user via the console.
*/

const consoleMessagePrefix = '[layer-parser]:';
/** Function that generates idented string for displaying lists in the console. */
export function consoleListJoinString (nested = 1) {
	let separator = "\n";
	for (let i = 0; i < nested; i++) {
		separator += '\t';
	}
	separator += "- ";
	return separator;
}

export function log(message: string) {
	console.log(`${ consoleMessagePrefix } ${ message }`);
}

export function warn(warning: string) {
	console.warn(`${ consoleMessagePrefix } ${ warning }`);
}

export function error(error: string) {
	console.error(`${ consoleMessagePrefix } ${ error }`);
}