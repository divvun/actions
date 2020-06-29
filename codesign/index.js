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
const exec = __importStar(require("@actions/exec"));
const shared_1 = require("../shared");
async function run() {
    const filePath = core.getInput('path', { required: true });
    const sec = shared_1.secrets();
    if (process.platform == "win32") {
        const pw = sec.windows.pfxPassword;
        const pfx = `${shared_1.divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`;
        await exec.exec("signtool.exe", [
            "sign", "/t", "http://timestamp.verisign.com/scripts/timstamp.dll",
            "/f", pfx, "/p", pw,
            filePath
        ]);
    }
    else {
        throw new Error("Unsupported platform: " + process.platform);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
