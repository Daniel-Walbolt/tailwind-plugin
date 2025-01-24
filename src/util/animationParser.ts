const DIRECTIONS = new Set<Direction | string>([
	"normal",
	"reverse",
	"alternate",
	"alternate-reverse"
]);
const PLAY_STATES = new Set<PlayState>([ "running", "paused" ]);
const FILL_MODES = new Set<FillMode>([
	"none",
	"forwards",
	"backwards",
	"both"
]);
const ITERATION_COUNTS = new Set<IterationCount>(["infinite"]);
const TIMINGS = new Set<Timings>([
	"linear",
	"ease",
	"ease-in",
	"ease-out",
	"ease-in-out",
	"step-start",
	"step-end"
]);
const TIMING_FNS: TimingFunction[] = [ "cubic-bezier", "steps" ];

// Comma separator that is not located between brackets. E.g.: `cubic-bezier(a, b, c)` these don't count.
const COMMA = /,(?![^(]*\))/g;
// Similar to the one above, but with spaces instead.
const SPACE = / +(?![^(]*\))/g;
const TIME = /^(-?[\d.]+m?s)$/;
const DIGIT = /^(\d+)$/;

type Direction = "normal" | "reverse" | "alternate" | "alternate-reverse";
type PlayState = "running" | "paused";
type FillMode = "none" | "forwards" | "backwards" | "both";
type IterationCount = "infinite" | number;
type Timings = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "step-start" | "step-end";
type TimingFunction = "cubic-bezier" | "steps";

export type ParsedAnimation = {
	direction: Direction;
	playState: PlayState;
	fillMode: FillMode;
	iterationCount: IterationCount;
	timings: Timings;
	timingFunction: TimingFunction;
	/** The duration with ms/s attached */
	duration: string;
	delay: string;
	/** The name of the keyframe to use for the animation */
	name: string;
	/** Any part of the animation that was not recognized */
	unknown: string[];
	/** The sum of every part, in its original form */
	value: string;
}

/**
 * Parses a CSS animation value into a JS object
 * @param input
 */
export default function parseAnimationValue(input: string): Partial<ParsedAnimation>[] {
	// User can define multiple animations in an animation declaration.
	// Split them up at the commas that exist outside of brackets.
	const animations: string[] = input.split(COMMA);

	return animations.map((animation): Partial<ParsedAnimation> => {
		const value: any = animation.trim();
		const result: Partial<ParsedAnimation> = { value };
		const parts: any = value.split(SPACE);
		const seen = new Set<string>();

		for (const part of parts) {
			if (!seen.has("DIRECTIONS") && DIRECTIONS.has(part)) {
				result.direction = part;
				seen.add("DIRECTIONS");
			} else if (!seen.has("PLAY_STATES") && PLAY_STATES.has(part)) {
				result.playState = part;
				seen.add("PLAY_STATES");
			} else if (!seen.has("FILL_MODES") && FILL_MODES.has(part)) {
				result.fillMode = part;
				seen.add("FILL_MODES");
			} else if (!seen.has("ITERATION_COUNTS") && (ITERATION_COUNTS.has(part) || DIGIT.test(part))) {
				result.iterationCount = part;
				seen.add("ITERATION_COUNTS");
			} else if (!seen.has("TIMING_FUNCTION") && TIMINGS.has(part)) {
				result.timingFunction = part;
				seen.add("TIMING_FUNCTION");
			} else if (!seen.has("TIMING_FUNCTION") && TIMING_FNS.some((f) => part.startsWith(`${ f }(`))) {
				result.timingFunction = part;
				seen.add("TIMING_FUNCTION");
			} else if (!seen.has("DURATION") && TIME.test(part)) {
				result.duration = part;
				seen.add("DURATION");
			} else if (!seen.has("DELAY") && TIME.test(part)) {
				result.delay = part;
				seen.add("DELAY");
			} else if (!seen.has("NAME")) {
				result.name = part;
				seen.add("NAME");
			} else {
				result.unknown ??= [];
				result.unknown.push(part);
			}
		}
		return result;
	});
}
