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
const tmp_1 = __importDefault(require("tmp"));
const shared_1 = require("../shared");
const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`;
async function makeInstaller(issPath, defines = []) {
    const sec = shared_1.secrets();
    const signCmd = `/S"signtool=signtool.exe sign ` +
        `/t http://timestamp.verisign.com/scripts/timstamp.dll ` +
        `/f ${shared_1.DIVVUN_PFX} ` +
        `/p ${sec.windows.pfxPassword} $f"`;
    const installerOutput = tmp_1.default.dirSync({ keep: true }).name;
    await exec.exec(`${ISCC_PATH} ${signCmd}`, [
        "/Qp", `/O${installerOutput}`, ...defines, issPath
    ]);
    return installerOutput;
}
exports.makeInstaller = makeInstaller;
