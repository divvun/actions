"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeInstaller = void 0;
const exec = __importStar(require("@actions/exec"));
const tmp_1 = __importDefault(require("tmp"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../shared");
const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`;
async function makeInstaller(issPath, defines = []) {
    const sec = (0, shared_1.secrets)();
    const signCmd = `/S"signtool=signtool.exe sign ` +
        `/t ${shared_1.RFC3161_URL} ` +
        `/f ${shared_1.DIVVUN_PFX} ` +
        `/p ${sec.windows.pfxPassword} $f"`;
    const installerOutput = tmp_1.default.dirSync({ keep: true }).name;
    await exec.exec(`${ISCC_PATH} ${signCmd}`, [
        "/Qp", `/O${installerOutput}`, ...defines, issPath
    ]);
    return path_1.default.join(installerOutput, "install.exe");
}
exports.makeInstaller = makeInstaller;
