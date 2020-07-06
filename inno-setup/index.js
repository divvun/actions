"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const path_1 = __importDefault(require("path"));
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
    core.setOutput("installer-path", path_1.default.join(installerOutput, "install.exe"));
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
