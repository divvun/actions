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
const lib_1 = require("./lib");
async function run() {
    const issPath = core.getInput('path', { required: true });
    const rawDefines = core.getInput('defines');
    let defines = [];
    if (rawDefines != null) {
        defines = rawDefines.split(" ")
            .map(x => `/D${x.trim()}`);
    }
    const installerOutput = await lib_1.makeInstaller(issPath, defines);
    core.setOutput("installer-path", installerOutput);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
