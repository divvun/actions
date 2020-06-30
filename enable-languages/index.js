"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const shared_1 = require("../shared");
async function run() {
    const tags = core.getInput('tags', { required: true }).split(",").map(x => x.trim());
    let script = `$langs = Get-WinUserLanguageList; `;
    for (const tag of tags) {
        script += `$langs.add('${tag}'); `;
    }
    script += `Set-WinUserLanguageList -LanguageList $langs;`;
    await shared_1.Powershell.runScript(script);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
