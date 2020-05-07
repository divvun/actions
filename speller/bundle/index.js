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
const path_1 = __importDefault(require("path"));
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const shared_1 = require("../../shared");
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        console.log(manifest);
        const bundleType = core.getInput('bundleType');
        const bundle = manifest.bundles[bundleType];
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`);
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
        console.log(shared_1.divvunConfigDir());
        if (bundleType == "speller_macos") {
            console.log(process.env);
            const args = [
                "-R", "-o", "output", "-t", "osx",
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
                "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
                "-n", await shared_1.getDivvunEnv("DEVELOPER_ACCOUNT"),
                "-k", await shared_1.getDivvunEnv("DEVELOPER_PASSWORD_CHAIN_ITEM"),
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
            core.setOutput("bundle", path_1.default.resolve(outputFile));
        }
        else if (bundleType == "speller_win") {
            const args = ["-R", "-t", "win", "-o", "output",
                "--uuid", bundle.uuid,
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-c", `${shared_1.divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
                "speller",
                "-f", manifest.package.name
            ].concat(spellerArgs);
            const exit = await exec.exec("divvun-bundler.exe", args, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await shared_1.getDivvunEnv("SIGN_PFX_PASSWORD")
                }
            });
            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.exe`;
            if (exit != 0 || !fs_1.default.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }
            core.setOutput("bundle", path_1.default.resolve(outputFile));
        }
        else if (bundleType == "speller_win_mso") {
            const args_mso = ["-R", "-t", "win", "-o", "output",
                "--uuid", bundle.uuid,
                "-H", `${manifest.package.human_name} MSOffice`,
                "-V", manifest.package.version,
                "-c", `${shared_1.divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
                "speller_mso",
                "-f", manifest.package.name,
                "--reg", await io.which("win-reg-tool.exe")
            ].concat(spellerMsoArgs);
            const exitMso = await exec.exec("divvun-bundler.exe", args_mso, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await shared_1.getDivvunEnv("SIGN_PFX_PASSWORD")
                }
            });
            const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`;
            if (exitMso != 0 || !fs_1.default.existsSync(outputFileMso)) {
                throw new Error("divvun-bundler failed");
            }
            core.setOutput("bundle", path_1.default.resolve(outputFileMso));
        }
        else if (bundleType == "speller_mobile") {
            const files = [];
            const tarDir = path_1.default.resolve("_tar");
            await io.mkdirP(tarDir);
            for (const spellerName in manifest.spellers) {
                const speller = manifest.spellers[spellerName];
                const spellerTargetFileName = `${spellerName}.zhfst`;
                const spellerNewFileName = `${spellerName}.bhfst`;
                await io.cp(speller.filename, path_1.default.join(tarDir, spellerTargetFileName));
                const exit = await exec.exec("thfst-tools", ["zhfst-to-bhfst", spellerTargetFileName], {
                    cwd: tarDir
                });
                if (exit != 0) {
                    throw new Error(`Failed to convert ${spellerName}`);
                }
                files.push(spellerNewFileName);
            }
            const outputFile = path_1.default.resolve(tarDir, `${manifest.package.name}-${manifest.package.version}.txz`);
            console.log(outputFile);
            const exit = await exec.exec("tar", ["cJf", outputFile].concat(files), { cwd: tarDir });
            if (exit != 0) {
                throw new Error("tar failed");
            }
            core.setOutput("bundle", path_1.default.resolve(outputFile));
        }
        else {
            throw new Error(`Unsupported bundleType ${bundleType}`);
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
