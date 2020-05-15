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
const github = __importStar(require("@actions/github"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE'];
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path_1.default.resolve(runner, "divvun-ci-config");
}
exports.divvunConfigDir = divvunConfigDir;
function shouldDeploy() {
    const isMaster = github.context.ref == 'refs/heads/master';
    return isMaster;
}
exports.shouldDeploy = shouldDeploy;
function loadEnv() {
    const p = path_1.default.resolve(divvunConfigDir(), "enc", "env.json");
    try {
        const s = fs_1.default.readFileSync(p, "utf8");
        return JSON.parse(s);
    }
    catch (_a) {
        console.error("Failed to load divvun env");
        return {};
    }
}
exports.loadEnv = loadEnv;
