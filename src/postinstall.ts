/**
 * Postinstall script - print setup instructions with colors
 */

// Force colors
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const brightCyan = '\x1b[96m';
const brightGreen = '\x1b[92m';
const brightMagenta = '\x1b[95m';
const gray = '\x1b[90m';
const bgMagenta = '\x1b[45m';
const white = '\x1b[97m';

console.log(`
${cyan}┌───────────────────────────────────────────────────────────┐${reset}
${cyan}│${reset}  ${brightGreen}${bold}codemap${reset} installed!                                       ${cyan}│${reset}
${cyan}├───────────────────────────────────────────────────────────┤${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}  ${bold}Step 1:${reset} Set up Claude Code integration                   ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}    ${brightCyan}npx @claudetools/codemap init${reset}                        ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}  ${bold}Step 2:${reset} ${bgMagenta}${white}${bold} RECOMMENDED ${reset} Keep index updated              ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}    ${brightMagenta}npx @claudetools/codemap index --watch${reset}               ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}    ${dim}Run in a separate terminal while developing${reset}           ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}├───────────────────────────────────────────────────────────┤${reset}
${cyan}│${reset}  ${dim}Options:${reset}                                                 ${cyan}│${reset}
${cyan}│${reset}    ${dim}--global${reset}      ${gray}Install to ~/.claude/ instead${reset}            ${cyan}│${reset}
${cyan}│${reset}    ${dim}--no-index${reset}    ${gray}Skip building the index${reset}                  ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}└───────────────────────────────────────────────────────────┘${reset}
`);
