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
const exec = __importStar(require("@actions/exec"));
const path_1 = __importDefault(require("path"));
const github = __importStar(require("@actions/github"));
function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE'];
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path_1.default.resolve(runner, "divvun-ci-config");
}
exports.divvunConfigDir = divvunConfigDir;
async function getDivvunEnv(name) {
    let output = "";
    const options = {
        cwd: divvunConfigDir(),
        listeners: {
            stdout: (data) => {
                output += data.toString();
            },
            stderr: (data) => {
                console.log(data.toString());
            }
        }
    };
    await exec.exec("bash", ["-c", `source ./enc/env.sh && echo $${name}`], options);
    return output.trim();
}
exports.getDivvunEnv = getDivvunEnv;
function shouldDeploy() {
    const isMaster = github.context.ref == 'refs/heads/master';
    return isMaster;
}
exports.shouldDeploy = shouldDeploy;
