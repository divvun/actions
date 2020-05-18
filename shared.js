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
const yaml_1 = __importDefault(require("yaml"));
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
    const s = fs_1.default.readFileSync(p, "utf8");
    return JSON.parse(s);
}
exports.loadEnv = loadEnv;
function loadKbdgenTarget(kbdgenPath, target) {
    return yaml_1.default.parse(fs_1.default.readFileSync(path_1.default.resolve(kbdgenPath, "targets", `${target}.yaml`), 'utf8'));
}
exports.loadKbdgenTarget = loadKbdgenTarget;
function saveKbdgenTarget(kbdgenPath, target, body) {
    fs_1.default.writeFileSync(path_1.default.resolve(kbdgenPath, "targets", `${target}.yaml`), yaml_1.default.stringify(body), 'utf8');
}
exports.saveKbdgenTarget = saveKbdgenTarget;
