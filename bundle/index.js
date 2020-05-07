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
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE'];
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path_1.default.resolve(runner, "divvun-ci-config");
}
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
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        console.log(manifest);
        const isWindows = process.platform === 'win32';
        const spellerArgs = [];
        const spellerMsoArgs = [];
        for (const spellerName in manifest.spellers) {
            const speller = manifest.spellers[spellerName];
            const realSpellerName = (isWindows && speller.name_win) || spellerName;
            spellerArgs.push("-l");
            spellerArgs.push(realSpellerName);
            spellerArgs.push("-z");
            spellerArgs.push(speller.filename);
            spellerMsoArgs.push("-l");
            spellerMsoArgs.push(realSpellerName);
        }
        console.log(divvunConfigDir());
        if (process.platform == "darwin") {
            console.log(process.env);
            const args = [
                "-R", "-o", "output", "-t", "osx",
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
                "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
                "-n", await getDivvunEnv("DEVELOPER_ACCOUNT"),
                "-k", await getDivvunEnv("DEVELOPER_PASSWORD_CHAIN_ITEM"),
                "speller",
                "-f", manifest.package.name,
            ].concat(spellerArgs);
            console.log(args);
            const exit = await exec.exec("divvun-bundler", args, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info"
                }
            });
            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.pkg`;
            if (exit != 0 || !fs_1.default.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }
            core.setOutput("installer", outputFile);
        }
        else if (process.platform === "win32") {
            const args = ["-R", "-t", "win", "-o", "output",
                "--uuid", manifest.package.uuid_win,
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-c", `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
                "speller",
                "-f", manifest.package.name
            ].concat(spellerArgs);
            const exit = await exec.exec("divvun-bundler.exe", args, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await getDivvunEnv("SIGN_PFX_PASSWORD")
                }
            });
            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.exe`;
            if (exit != 0 || !fs_1.default.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }
            const args_mso = ["-R", "-t", "win", "-o", "output",
                "--uuid", manifest.package.uuid_win_mso,
                "-H", `${manifest.package.human_name} MSOffice`,
                "-V", manifest.package.version,
                "-c", `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
                "speller_mso",
                "-f", manifest.package.name,
                "--reg", await io.which("win-reg-tool.exe")
            ].concat(spellerMsoArgs);
            const exitMso = await exec.exec("divvun-bundler.exe", args_mso, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await getDivvunEnv("SIGN_PFX_PASSWORD")
                }
            });
            const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`;
            if (exitMso != 0 || !fs_1.default.existsSync(outputFileMso)) {
                throw new Error("divvun-bundler failed");
            }
            core.setOutput("installer", outputFile);
            core.setOutput("installer_mso", outputFileMso);
        }
        else {
            throw new Error(`Unsupported platform ${process.platform}`);
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
