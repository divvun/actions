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
const tc = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const os = __importStar(require("os"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../shared");
const TOOLS = {
    "divvun-bundler": {
        darwin: "https://github.com/divvun/divvun-bundler/releases/download/0.1.0/divvun-bundler-macos",
        win32: "https://github.com/divvun/divvun-bundler/releases/download/0.1.0/divvun-bundler.exe",
    },
    "win-reg-tool": {
        win32: "https://github.com/fry/win-reg-tool/releases/download/0.1.3/win-reg-tool.exe",
    },
    pahkat: {
        darwin: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat-macos",
        win32: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat.exe",
    },
    "pahkat-repomgr": {
        darwin: "https://github.com/divvun/pahkat/releases/download/test.2/pahkat_repomgr_1.0.0-alpha.1_macos",
        win32: "https://github.com/divvun/pahkat/releases/download/test.2/pahkat-repomgr_1.0.0-alpha.1_windows_amd64.exe",
    },
    kbdgen: {
        darwin: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.11/kbdgen_2.0.0-alpha.11_macos_amd64.tar.xz",
        linux: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.11/kbdgen_2.0.0-alpha.11_linux_amd64.tar.xz",
        win32: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.11/kbdgen_2.0.0-alpha.11_windows_amd64.exe",
    },
    xcnotary: {
        darwin: "https://github.com/fry/xcnotary/releases/download/v0.4.1/xcnotary"
    },
    "thfst-tools": {
        win32: "https://github.com/divvun/divvunspell/releases/download/v1.0.0-alpha.2/thfst-tools_win.exe",
        darwin: "https://github.com/divvun/divvunspell/releases/download/v1.0.0-alpha.2/thfst-tools_macos",
        linux: "https://github.com/divvun/divvunspell/releases/download/v1.0.0-alpha.2/thfst-tools_linux"
    }
};
const TOOLS_PATH = "_tools";
function getSetupScript() {
    if (process.platform == "darwin")
        return `${__dirname}/setup-macos.sh`;
    if (process.platform == "win32")
        return `${__dirname}/setup-win.sh`;
    if (process.platform == "linux")
        return `${__dirname}/setup-linux.sh`;
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
        await exec.exec("bash", [getSetupScript()], {
            cwd: process.env['RUNNER_WORKSPACE'],
            env: {
                "DIVVUN_KEY": divvunKey,
                "HOME": os.homedir()
            }
        });
        if (process.platform == "win32") {
            core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool");
        }
        core.exportVariable("DIVVUN_CI_CONFIG", shared_1.divvunConfigDir());
        console.log("Installing tools");
        for (const toolName in TOOLS) {
            console.log(`installing tool ${toolName}`);
            const url = getToolUrl(toolName);
            if (!url) {
                console.log("tool not available");
                continue;
            }
            const toolDir = path_1.default.resolve(TOOLS_PATH, toolName);
            console.log(`tool dir ${toolDir}`);
            io.mkdirP(toolDir);
            const downloadPath = await tc.downloadTool(url);
            console.log(downloadPath, url);
            const toolDest = `${toolDir}/${toolName}`;
            if (url.endsWith("tar.xz")) {
                console.log("extracting tool");
                if (process.platform != "win32") {
                    console.log(downloadPath, toolDir);
                    await tc.extractTar(downloadPath, toolDir, "xJ");
                    await exec.exec("chmod", ['+x', toolDest]);
                }
                else
                    throw new Error("Can't extract tool on windows");
            }
            else {
                if (process.platform == "win32") {
                    io.cp(downloadPath, `${toolDest}.exe`);
                }
                else {
                    io.cp(downloadPath, toolDest);
                    exec.exec("chmod", ['+x', toolDest]);
                }
            }
            core.addPath(toolDir);
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
