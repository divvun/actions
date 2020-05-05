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
// import * as github from '@actions/github'
const tc = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const TOOLS = {
    divvun_bundler: {
        darwin: "https://github.com/divvun/divvun-bundler/releases/download/0.1.0/divvun-bundler-macos",
        win32: "https://github.com/divvun/divvun-bundler/releases/download/0.1.0/divvun-bundler.exe",
    },
    reg_tool: {
        win32: "https://github.com/fry/win-reg-tool/releases/download/0.1.3/win-reg-tool.exe",
    },
    pahkat: {
        darwin: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat-macos",
        win32: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat.exe",
    },
    kbdgen: {
        darwin: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.5/kbdgen_2.0.0-alpha.5_macos_amd64.tar.xz",
        linux: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.5/kbdgen_2.0.0-alpha.5_linux_amd64.tar.xz",
        win32: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.5/kbdgen_2.0.0-alpha.5_windows_amd64.exe",
    }
};
const TOOLS_PATH = "_tools";
function getSetupScript() {
    if (process.platform == "darwin")
        return "setup-macos.sh";
    // if (process.platform == "linux")
    //   return "setup-linux.sh"
    throw new Error(`Unsupported platform ${process.platform}`);
}
function getToolUrl(name) {
    const toolsOs = TOOLS[name];
    if (!toolsOs)
        throw new Error(`No such tool ${name}`);
    return toolsOs[process.platform];
}
async function run() {
    try {
        const divvunKey = core.getInput('key');
        console.log("Setting up environment");
        await exec.exec(getSetupScript(), undefined, {
            env: {
                "DIVVUN_KEY": divvunKey
            }
        });
        console.log("Installing tools");
        //const toolName = "divvun-bundler"
        for (const toolName in TOOLS) {
            console.log(`installing tool ${toolName}`);
            const toolDir = `${TOOLS_PATH}/${toolName}`;
            io.mkdirP(toolDir);
            const downloadPath = await tc.downloadTool(getToolUrl(toolName), toolDir);
            if (downloadPath.endsWith("tar.xz")) {
                if (process.platform != "win32")
                    tc.extractTar(downloadPath);
                else
                    throw new Error("Can't extract tool on windows");
            }
            core.addPath(toolDir);
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
