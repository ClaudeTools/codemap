/**
 * Postinstall script - print setup instructions with colors
 */

// Force colors
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const brightCyan = '\x1b[96m';
const brightGreen = '\x1b[92m';
const gray = '\x1b[90m';

console.log(`
${cyan}┌───────────────────────────────────────────────────────────┐${reset}
${cyan}│${reset}  ${brightGreen}${bold}codemap${reset} installed!                                       ${cyan}│${reset}
${cyan}├───────────────────────────────────────────────────────────┤${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}  Run this to set up Claude Code integration:              ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}    ${brightCyan}npx @claudetools/codemap init${reset}                        ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}  This will:                                               ${cyan}│${reset}
${cyan}│${reset}    ${green}•${reset} Install skill to ${dim}.claude/${reset} ${gray}(commit to git)${reset}            ${cyan}│${reset}
${cyan}│${reset}    ${green}•${reset} Add instructions to ${dim}.claude/CLAUDE.md${reset}                ${cyan}│${reset}
${cyan}│${reset}    ${green}•${reset} Build the codebase index                             ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}│${reset}  Options:                                                 ${cyan}│${reset}
${cyan}│${reset}    ${dim}--global${reset}      Install to ~/.claude/ instead            ${cyan}│${reset}
${cyan}│${reset}    ${dim}--no-index${reset}    Skip building the index                  ${cyan}│${reset}
${cyan}│${reset}                                                           ${cyan}│${reset}
${cyan}└───────────────────────────────────────────────────────────┘${reset}
`);
