var X=Object.create;var I=Object.defineProperty;var Z=Object.getOwnPropertyDescriptor;var ee=Object.getOwnPropertyNames;var te=Object.getPrototypeOf,re=Object.prototype.hasOwnProperty;var ne=(e,t)=>{for(var s in t)I(e,s,{get:t[s],enumerable:!0})},K=(e,t,s,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of ee(t))!re.call(e,r)&&r!==s&&I(e,r,{get:()=>t[r],enumerable:!(i=Z(t,r))||i.enumerable});return e};var se=(e,t,s)=>(s=e!=null?X(te(e)):{},K(t||!e||!e.__esModule?I(s,"default",{value:e,enumerable:!0}):s,e)),ie=e=>K(I({},"__esModule",{value:!0}),e);var Re={};ne(Re,{MatchedAnimationRule:()=>R,ParseCSS:()=>Me,cssParser:()=>D,resetData:()=>$});module.exports=ie(Re);function B(e,t={}){return e.type==="decl"&&(t[e.prop]=e.value),t}function w(e,t={},s=!0){if(e.type==="rule"){let i={};for(let r of e.nodes)r.type==="decl"?i=B(r,i):r.type==="rule"?i=w(r,i):r.type==="atrule"&&(i=P(r,i));if(s)t[e.selector]=i;else return i;return t}}function P(e,t={}){var s;if(e.type==="atrule"){let i={};if((s=e.nodes)!=null&&s[Symbol.iterator])for(let r of e.nodes)r.type==="decl"?i=B(r,i):r.type==="rule"?i=w(r,i):r.type==="atrule"&&(i=P(r,i));return t[`@${e.name} ${e.params}`]=i,t}}var ae=new Set(["normal","reverse","alternate","alternate-reverse"]),oe=new Set(["running","paused"]),le=new Set(["none","forwards","backwards","both"]),ue=new Set(["infinite"]),fe=new Set(["linear","ease","ease-in","ease-out","ease-in-out","step-start","step-end"]),me=["cubic-bezier","steps"],pe=/,(?![^(]*\))/g,de=/ +(?![^(]*\))/g,E=/^(-?[\d.]+m?s)$/,ce=/^(\d+)$/;function v(e){return e.split(pe).map(s=>{var a;let i=s.trim(),r={value:i},l=i.split(de),o=new Set;for(let n of l)!o.has("DIRECTIONS")&&ae.has(n)?(r.direction=n,o.add("DIRECTIONS")):!o.has("PLAY_STATES")&&oe.has(n)?(r.playState=n,o.add("PLAY_STATES")):!o.has("FILL_MODES")&&le.has(n)?(r.fillMode=n,o.add("FILL_MODES")):!o.has("ITERATION_COUNTS")&&(ue.has(n)||ce.test(n))?(r.iterationCount=n,o.add("ITERATION_COUNTS")):!o.has("TIMING_FUNCTION")&&fe.has(n)||!o.has("TIMING_FUNCTION")&&me.some(u=>n.startsWith(`${u}(`))?(r.timingFunction=n,o.add("TIMING_FUNCTION")):!o.has("DURATION")&&E.test(n)?(r.duration=n,o.add("DURATION")):!o.has("DELAY")&&E.test(n)?(r.delay=n,o.add("DELAY")):o.has("NAME")?((a=r.unknown)!=null||(r.unknown=[]),r.unknown.push(n)):(r.name=n,o.add("NAME"));return r})}var x=new Map,h=new Map;function J(){x.clear(),h.clear()}function _(e,t,s){if(e.name==="keyframes"){if(e.parent.type=="rule")return!1;let i=m(e);return x.set(i,e),!0}return!1}function j(e,t,s,i,r){var l;for(let[o,a]of h.entries()){let n=a.rule;t.delete(o),s.delete(o);let u=w(n,{},!1),M=r.animationPrefix,p=new R({node:n,stringifiedNode:u},M);for(let y of a.keyframes){let g=x.get(y);if(g==null){let U=(l=i.get(y))!=null?l:new Set;U.has(n.selector)||U.add(n.selector);continue}let H=P(g);p.content.push({node:g,stringifiedNode:H})}e.set(o,p)}}function z(e,t){var s,i;if(e.prop=="animation"){let r=m(t),l=v(e.value),o=!1;for(let a of l){let n=a.name;if(n==null)continue;let u=(s=h.get(r))!=null?s:{rule:t,keyframes:new Set};u.keyframes.has(n)||u.keyframes.add(`@keyframes ${n}`),h.set(r,u),o=!0}return o}else if(e.prop=="animation-name"){let r=m(t),l=(i=h.get(r))!=null?i:{rule:t,keyframes:new Set};return l.keyframes.has(e.value)||l.keyframes.add(`@keyframes ${e.value}`),h.set(r,l),!0}return!1}function m(e){let t="";return e.type=="rule"?(e=e,t=e.selector):e.type=="atrule"&&(e=e,t=`@${e.name} ${e.params}`),t}function A(e,t,s,i,r=1){if(e.nodes==null||e.nodes.length==0)return;let l="",o="";for(let n=0;n<r;n++)l+="	",n<r-1&&(o+="	");let a=t.openBracketNewLine?`
${o}`:" ";if(e.type==="rule"){let n=e,u=n.selectors.join(`,
${o}`);n.selector=u,n.raws.between=a}else if(e.type=="atrule"){let n=e;n.params=n.params.trim(),n.raws.afterName=" ",n.raws.between=a}for(let n of e.nodes)n.type=="decl"&&i.type=="rule"&&z(n,i),n.raws.before=`
`+l,n.raws.after=`
`+l,A(n,t,s,i,r+1);r==1&&(e.raws.before=`
`,t.commentType!=="None"&&(e.raws.before+=`/* From ${s.opts.from} */
`),e.raws.after=`
`)}var R=class{constructor(t,s){this.content=[];this.rule=t,this.intellisensePrefix=s}getMatchedContent(){let t={},s=this.content.map(r=>r.stringifiedNode),i=Object.fromEntries(s.entries());return t[this.intellisensePrefix]=()=>[i,this.rule.stringifiedNode],t}getMatchedValues(){let t={},s=m(this.rule.node).match(/\w+/g).join("-");return t[s]="",{values:t}}};var k=require("fs"),F=require("path"),Q=se(require("postcss"));var L="[layer-parser]:";function N(e=1){let t=`
`;for(let s=0;s<e;s++)t+="	";return t+="- ",t}function T(e){console.log(`${L} ${e}`)}function f(e){console.warn(`${L} ${e}`)}function Y(e){console.error(`${L} ${e}`)}var q=require("glob");var d=new Map,c=new Map,O=new Map,C=new Map,S=new Map,b=new Map;function W(e,t){let s=m(e);if(c.has(s)||d.has(s)){let i=C.get(s);if(i){let r=i==null?void 0:i.get(t.opts.from);r?i.set(t.opts.from,r+1):i.set(t.opts.from,1)}else C.set(s,new Map([[t.opts.from,1]]));return!1}return!0}function ye(e,t,s){var r,l,o;let i=m(e);if(((r=e.parent)==null?void 0:r.type)==="root"){if(W(e,t)){if(s.unlayeredClassBehavior==="Ignore"){let a=(l=S.get(i))!=null?l:new Set;a.add(t.opts.from),S.set(i,a);return}A(e,s,t,e),s.unlayeredClassBehavior==="Utility"?c.set(i,e):s.unlayeredClassBehavior==="Component"&&d.set(i,e)}}else if(((o=e.parent)==null?void 0:o.type)=="atrule"&&W(e,t)){let a=e.parent;a.params==="components"?(A(e,s,t,e),d.set(i,e)):a.params==="utilities"&&(A(e,s,t,e),c.set(i,e))}}function ge(e,t,s){_(e,t,s)}function he(e){return()=>({Rule(t,{result:s}){ye(t,s,e)},AtRule:{keyframes:(t,{result:s})=>{ge(t,s,e)}}})}function Se(e){var s,i,r,l,o;let t=a=>a!==!0&&a!==!1;e.directory==null&&(f("There was no directory provided. Defaulting to process.cwd()."),e.directory=process.cwd()),(s=e.commentType)!=null||(e.commentType="File"),e.commentType!=="File"&&e.commentType!="Absolute"&&e.commentType!="None"&&(f("Invalid configuration for commentType. Defaulting to 'File'"),e.commentType="File"),(i=e.openBracketNewLine)!=null||(e.openBracketNewLine=!1),t(e.openBracketNewLine)&&(f("Invalid configuration for openBracketNewLine. Defaulting to false"),e.openBracketNewLine=!1),(r=e.debug)!=null||(e.debug=!1),t(e.debug)&&(f("Invalid configuration for debug. Defaulting to false."),e.debug=!1),(l=e.unlayeredClassBehavior)!=null||(e.unlayeredClassBehavior="Utility"),e.unlayeredClassBehavior!=="Utility"&&e.unlayeredClassBehavior!=="Component"&&e.unlayeredClassBehavior!=="Ignore"&&(f("Invalid configuration for unlayedClassBehavior. Defaulting to Utility"),e.unlayeredClassBehavior="Utility"),(o=e.globPatterns)!=null||(e.globPatterns=["**/*.css"]),(e.animationPrefix==null||e.animationPrefix.trim().length==0)&&(e.animationPrefix="animate")}function $(){d.size==0&&c.size==0&&T("Reset parsed components and utilities."),d.clear(),c.clear(),O.clear(),J()}function D(e){if(e.globPatterns!=null&&e.globPatterns.length>0){for(let a of e.globPatterns)if(a.startsWith("/**"))return Y(`
					User attempted to glob their entire computer using: ${a}.
					This would result in a serious performance problem, and thus parsing has been skipped.
				`),{components:[],utilities:[],keyframeUtilities:[]}}Se(e),C.clear(),S.clear(),b.clear();let t=(0,F.resolve)(e.directory),s=[];s=(0,q.globSync)(e.globPatterns,{cwd:t}),e.debug&&(T(`Searched directories: ${t}`),T(`Found: ${s.join("	")}`));let i={postcssPlugin:"layer-parser",prepare:he(e)},r=[],l=(0,Q.default)([i]),o;switch(e.commentType){case"Absolute":o=(a,n)=>{let u=(0,k.readFileSync)(n,"utf8");l.process(u,{from:n,to:n}).then()};break;default:o=(a,n)=>{let u=(0,k.readFileSync)(n,"utf8");l.process(u,{from:a,to:a}).then()};break}for(let a of s){if(!a.endsWith(".css")){r.push(a);continue}let n=(0,F.resolve)(t,a);o(a,n)}if(r.length>0&&f(`Globbing resulted in files that did not end in .css:
	${r.join(N())}`),S.size>0){let a=`The target directory: ${e.directory} had ${S.size} unlayered css rules not parsed:`;if(e.debug)for(let[n,u]of S)a+=`
	${n}`,a+=`
		- `,a+=Array.from(u.values()).join(N(2));f(a)}if(C.size>0){let a="",n=0;for(let[M,p]of C){a+=`
	${M}`;for(let[y,g]of p)a+=`${N(2)}${y} - ${g}`,n+=g}let u=`Found ${n} rules with selectors that were already used.
			Note, this only discovers root-level (not nested) duplicates that would be added based on the configuration.`;e.debug&&(u+=a),f(u)}if(j(O,d,c,b,e),b.size>0){let a="",n=0;for(let[M,p]of b){a+=`
	${M}`,n+=p.size;for(let y of p)a+=`${N(2)}${y}`}let u=`Could not find ${n} keyframes that were referenced by the searched CSS files.`;e.debug&&(u+=a),f(u)}return{utilities:Array.from(c.values()),components:Array.from(d.values()),keyframeUtilities:Array.from(O.values())}}function Me(e){return({addUtilities:t,addComponents:s,matchUtilities:i})=>{$();let r=D(e);console.log("Utilities:",r.utilities.length,"Components:",r.components.length);for(let l of r.utilities)console.log(l.toString(),`
`),t(l.toString());for(let l of r.components)s({".test-class":{transition:`background-color,
color,
display`}});for(let l of r.keyframeUtilities)i(l.getMatchedContent(),l.getMatchedValues())}}0&&(module.exports={MatchedAnimationRule,ParseCSS,cssParser,resetData});
