"use strict";
var __importStar = (this && this.__importStar) || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
        for (var k in mod)
            if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function(mod) {
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
<<<<<<< HEAD
async function bundleEnv(env) {
=======
const yaml_1 = __importDefault(require("yaml"));
async function bundleEnv() {
>>>>>>> add kbdgen building
    return {
        ...process.env,
        "RUST_LOG": "info",
        "SIGN_PFX_PASSWORD": env.windows.pfxPassword,
    };
}
<<<<<<< HEAD
async function run() {
    try {
        const env = shared_1.loadEnv();
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
        if (bundleType == "speller_macos") {
            console.log(process.env);
            const args = [
                "-R", "-o", "output", "-t", "osx",
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
                "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
                "-n", env.macos.developerAccount,
                "-k", env.macos.passwordChainItem,
                "speller",
                "-f", manifest.package.name,
            ].concat(spellerArgs);
            const exit = await exec.exec("divvun-bundler", args, {
                env: await bundleEnv(env)
=======
async function bundleSpeller(manifest, bundleType) {
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
    if (bundleType == "speller_macos") {
        console.log(process.env);
        const args = [
            "-R", "-o", "output", "-t", "osx",
            "-H", manifest.package.human_name,
            "-V", manifest.package.version,
            "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
            "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
            "-n", await shared_1.getDivvunEnv("MACOS_DEVELOPER_ACCOUNT"),
            "-k", await shared_1.getDivvunEnv("MACOS_DEVELOPER_PASSWORD_CHAIN_ITEM"),
            "speller",
            "-f", manifest.package.name,
        ].concat(spellerArgs);
        const exit = await exec.exec("divvun-bundler", args, {
            env: await bundleEnv()
        });
        const outputFile = `output/${manifest.package.name}-${manifest.package.version}.pkg`;
        if (exit != 0 || !fs_1.default.existsSync(outputFile)) {
            throw new Error("divvun-bundler failed");
        }
        return path_1.default.resolve(outputFile);
    } else if (bundleType == "speller_win") {
        const args = ["-R", "-t", "win", "-o", "output",
            "--uuid", manifest.bundles[bundleType].uuid,
            "-H", manifest.package.human_name,
            "-V", manifest.package.version,
            "-c", `${shared_1.divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
            "speller",
            "-f", manifest.package.name
        ].concat(spellerArgs);
        const exit = await exec.exec("divvun-bundler.exe", args, {
            env: await bundleEnv()
        });
        const outputFile = `output/${manifest.package.name}-${manifest.package.version}.exe`;
        if (exit != 0 || !fs_1.default.existsSync(outputFile)) {
            throw new Error("divvun-bundler failed");
        }
        return path_1.default.resolve(outputFile);
    } else if (bundleType == "speller_win_mso") {
        const args_mso = ["-R", "-t", "win", "-o", "output",
            "--uuid", manifest.bundles[bundleType].uuid,
            "-H", `${manifest.package.human_name} MSOffice`,
            "-V", manifest.package.version,
            "-c", `${shared_1.divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
            "speller_mso",
            "-f", manifest.package.name,
            "--reg", await io.which("win-reg-tool.exe")
        ].concat(spellerMsoArgs);
        const exitMso = await exec.exec("divvun-bundler.exe", args_mso, {
            env: await bundleEnv()
        });
        const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`;
        if (exitMso != 0 || !fs_1.default.existsSync(outputFileMso)) {
            throw new Error("divvun-bundler failed");
        }
        return path_1.default.resolve(outputFileMso);
    } else if (bundleType == "speller_mobile") {
        const files = [];
        const tarDir = path_1.default.resolve("_tar");
        console.log(tarDir);
        await io.mkdirP(tarDir);
        for (const spellerName in manifest.spellers) {
            const speller = manifest.spellers[spellerName];
            const spellerTargetFileName = `${spellerName}.zhfst`;
            const spellerNewFileName = `${spellerName}.bhfst`;
            await io.cp(speller.filename, path_1.default.join(tarDir, spellerTargetFileName));
            await exec.exec("unzip", ["-vl", spellerTargetFileName], { cwd: tarDir });
            const exit = await exec.exec("thfst-tools", ["zhfst-to-bhfst", spellerTargetFileName], {
                cwd: tarDir
>>>>>>> add kbdgen building
            });
            if (exit != 0) {
                throw new Error(`Failed to convert ${spellerName}`);
            }
            files.push(spellerNewFileName);
        }
<<<<<<< HEAD
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
                env: await bundleEnv(env)
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
                env: await bundleEnv(env)
            });
            const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`;
            if (exitMso != 0 || !fs_1.default.existsSync(outputFileMso)) {
                throw new Error("divvun-bundler failed");
            }
            core.setOutput("bundle", path_1.default.resolve(outputFileMso));
=======
        const outputFile = path_1.default.resolve(tarDir, `${manifest.package.name}-${manifest.package.version}.txz`);
        console.log(outputFile);
        const exit = await exec.exec("tar", ["cJf", outputFile].concat(files), { cwd: tarDir });
        if (exit != 0) {
            throw new Error("tar failed");
        }
        return path_1.default.resolve(outputFile);
    }
}
async function consolidateLayouts(manifest) {
    if (!manifest.consolidated)
        throw new Error("No consolidated layout sources defined");
    const kbdgenPackagePath = path_1.default.resolve(`${manifest.package.name}.kbdgen`);
    await io.mkdirP("_kbdgit");
    for (const kbdgenPackageName in manifest.consolidated) {
        const layouts = manifest.consolidated[kbdgenPackageName];
        const tempDir = path_1.default.resolve("_kbdgit", kbdgenPackageName);
        const exit = await exec.exec("git", [
            "clone",
            "--depth=1", "--branch", layouts.branch || "master", "--single-branch",
            layouts.git, tempDir
        ]);
        if (exit != 0)
            throw new Error("git clone failed");
        for (const layout of layouts.layouts) {
            console.log(`copy layout ${layout}`);
            await io.mkdirP(path_1.default.join(kbdgenPackagePath, "layouts"));
            await io.cp(path_1.default.join(tempDir, "layouts", `${layout}.yaml`), path_1.default.join(kbdgenPackagePath, "layouts", `${layout}.yaml`));
>>>>>>> add kbdgen building
        }
        await io.rmRF(tempDir);
    }
}
async function bundleKeyboard(manifest, bundleType) {
    console.log("keyboard", bundleType);
    const kbdgenPackagePath = `${manifest.package.name}.kbdgen`;
    if (bundleType == "keyboard_android") {
        console.log("android", bundleType);
        if (!process.env.ANDROID_NDK_HOME)
            throw new Error("ANDROID_NDK_HOME not set");
        await consolidateLayouts(manifest);
        const androidTarget = yaml_1.default.parse(path_1.default.resolve(kbdgenPackagePath, "targets", "android.yaml"));
        const version = androidTarget["version"];
        const exit = await exec.exec("kbdgen", [
            "--logging", "debug",
            "build",
            "--github-username", await shared_1.getDivvunEnv("GITHUB_USERNAME"),
            "--github-token", await shared_1.getDivvunEnv("GITHUB_TOKEN"),
            "android", "-R", "--ci", "-o", "output",
            kbdgenPackagePath
        ], {
            env: {
                ...process.env,
                "NDK_HOME": process.env.ANDROID_NDK_HOME,
            }
        });
        if (exit != 0) {
            throw new Error("kbdgen failed");
        }
        return path_1.default.resolve(`output/${manifest.package.name}-${version}_release.apk`);
    }
}
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        const bundleType = core.getInput('bundleType');
        console.log(bundleType);
        const bundle = manifest.bundles[bundleType];
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`);
        const spellerOutput = bundleSpeller(manifest, bundleType) || bundleKeyboard(manifest, bundleType);
        console.log("output", spellerOutput);
        if (spellerOutput) {
            core.setOutput("bundle", spellerOutput);
        } else {
            throw new Error(`Unsupported bundleType ${bundleType}`);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}
run();