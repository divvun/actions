"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
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
    console.log("Installer generated.\n\n");
    core.setOutput("installer-path", installerOutput);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
