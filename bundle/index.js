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
// import * as github from '@actions/github'
// import * as tc from '@actions/tool-cache'
const exec = __importStar(require("@actions/exec"));
// import * as io from '@actions/io'
// import * as os from 'os'
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        console.log(manifestPath);
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        console.log(manifest);
        const args = [
            "-R", "-o output", "-t osx",
            "-H", manifest.package.human_name,
            "-V", manifest.package.version,
            "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
            "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
            "speller",
            "-f", manifest.package.name,
        ];
        for (const spellerName in manifest.spellers) {
            console.log(`speller ${spellerName}`);
            const speller = manifest.spellers[spellerName];
            args.push("-l");
            args.push(spellerName);
            args.push("-z");
            args.push(speller.filename);
        }
        await exec.exec("divvun-bundler", args);
        core.setOutput("installer", `output/${manifest.package.name}-${manifest.package.version}.pkg`);
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
