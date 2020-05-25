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
async function bundleEnv(env) {
    return {
        ...process.env,
        "RUST_LOG": "info",
        "SIGN_PFX_PASSWORD": env.windows.pfxPassword,
    };
}
async function bundleSpeller(manifest, bundleType) {
    const env = shared_1.loadEnv();
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
    const human_name = manifest.package.human_name;
    const version = manifest.package.version;
    if (bundleType == "speller_macos") {
        if (!human_name)
            throw new Error("no human_name specified");
        if (!version)
            throw new Error("no version specified");
        console.log(process.env);
        const args = [
            "-R", "-o", "output", "-t", "osx",
            "-H", human_name,
            "-V", version,
            "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
            "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
            "-n", env.macos.developerAccount,
            "-k", env.macos.passwordChainItem,
            "speller",
            "-f", manifest.package.name,
        ].concat(spellerArgs);
        const exit = await exec.exec("divvun-bundler", args, {
            env: await bundleEnv(env)
        });
        const outputFile = `output/${manifest.package.name}-${manifest.package.version}.pkg`;
        if (exit != 0 || !fs_1.default.existsSync(outputFile)) {
            throw new Error("divvun-bundler failed");
        }
        return path_1.default.resolve(outputFile);
    }
    else if (bundleType == "speller_win") {
        if (!human_name)
            throw new Error("no human_name specified");
        if (!version)
            throw new Error("no version specified");
        const args = ["-R", "-t", "win", "-o", "output",
            "--uuid", manifest.bundles[bundleType].uuid,
            "-H", human_name,
            "-V", version,
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
        return path_1.default.resolve(outputFile);
    }
    else if (bundleType == "speller_win_mso") {
        if (!human_name)
            throw new Error("no human_name specified");
        if (!version)
            throw new Error("no version specified");
        const args_mso = ["-R", "-t", "win", "-o", "output",
            "--uuid", manifest.bundles[bundleType].uuid,
            "-H", `${human_name} MSOffice`,
            "-V", version,
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
        return path_1.default.resolve(outputFileMso);
    }
    else if (bundleType == "speller_mobile") {
        if (!version)
            throw new Error("no version specified");
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
            });
            if (exit != 0) {
                throw new Error(`Failed to convert ${spellerName}`);
            }
            files.push(spellerNewFileName);
        }
        const outputFile = path_1.default.resolve(tarDir, `${manifest.package.name}-${version}.txz`);
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
            await io.cp(path_1.default.join(tempDir, `${kbdgenPackageName}.kbdgen`, "layouts", `${layout}.yaml`), path_1.default.join(kbdgenPackagePath, "layouts", `${layout}.yaml`));
        }
        await io.rmRF(tempDir);
    }
}
async function bundleKeyboard(manifest, bundleType) {
    const env = shared_1.loadEnv();
    const kbdgenPackagePath = `${manifest.package.name}.kbdgen`;
    if (bundleType == "keyboard_android") {
        if (!process.env.ANDROID_NDK_HOME)
            throw new Error("ANDROID_NDK_HOME not set");
        await consolidateLayouts(manifest);
        const androidTarget = shared_1.loadKbdgenTarget(kbdgenPackagePath, "android");
        const version = androidTarget["version"];
        if (!version)
            throw new Error("no version in android target");
        console.log(androidTarget);
        androidTarget['build'] = (+new Date / 1000 | 0);
        console.log(`bump build to ${androidTarget['build']}`);
        console.log(androidTarget);
        shared_1.saveKbdgenTarget(kbdgenPackagePath, "android", androidTarget);
        const exit = await exec.exec("kbdgen", [
            "--logging", "debug",
            "build",
            "android", "-R", "--ci", "-o", "output",
            kbdgenPackagePath
        ], {
            env: {
                ...process.env,
                "GITHUB_USERNAME": env.github.username,
                "GITHUB_TOKEN": env.github.token,
                "NDK_HOME": process.env.ANDROID_NDK_HOME,
                "ANDROID_KEYSTORE": path_1.default.join(shared_1.divvunConfigDir(), env.android.keystore),
                "ANDROID_KEYALIAS": env.android.keyalias,
                "STORE_PW": env.android.store_pw,
                "KEY_PW": env.android.key_pw,
                "PLAY_STORE_P12": path_1.default.join(shared_1.divvunConfigDir(), env.android.playStoreP12),
                "PLAY_STORE_ACCOUNT": env.android.playStoreAccount
            }
        });
        if (exit != 0) {
            throw new Error("kbdgen failed");
        }
        const file = path_1.default.resolve("output", `${manifest.package.name}-${version}_release.apk`);
        if (!fs_1.default.existsSync(file))
            throw new Error("no output generated");
        return file;
    }
    else if (bundleType == "keyboard_ios") {
        await consolidateLayouts(manifest);
        const iosTarget = shared_1.loadKbdgenTarget(kbdgenPackagePath, "ios");
        const version = iosTarget["version"];
        if (!version)
            throw new Error("no version in ios target");
        console.log(iosTarget);
        iosTarget['build'] = (+new Date / 1000 | 0);
        console.log(`bump build to ${iosTarget['build']}`);
        console.log(iosTarget);
        shared_1.saveKbdgenTarget(kbdgenPackagePath, "ios", iosTarget);
        const kbdgenEnv = {
            ...process.env,
            "GITHUB_USERNAME": env.github.username,
            "GITHUB_TOKEN": env.github.token,
            "MATCH_GIT_URL": env.ios.match_git_url,
            "MATCH_PASSWORD": env.ios.match_password,
            "FASTLANE_USER": env.ios.fastlane_user,
            "FASTLANE_PASSWORD": env.ios.fastlane_password,
            "MATCH_KEYCHAIN_NAME": "fastlane_tmp_keychain",
            "MATCH_KEYCHAIN_PASSWORD": ""
        };
        console.log("kbdgen init");
        let exit = await exec.exec("kbdgen", [
            "--logging", "debug",
            "build",
            "ios",
            kbdgenPackagePath, "init",
        ], {
            env: {
                ...kbdgenEnv,
                "PRODUCE_USERNAME": kbdgenEnv.FASTLANE_USER
            }
        });
        if (exit != 0) {
            throw new Error("kbdgen init failed");
        }
        console.log("kbdgen build");
        exit = await exec.exec("kbdgen", [
            "--logging", "debug",
            "build",
            "ios", "-R", "--ci", "-o", "output",
            "--kbd-branch", "master",
            kbdgenPackagePath
        ], {
            env: kbdgenEnv
        });
        if (exit != 0) {
            throw new Error("kbdgen failed");
        }
        const file = path_1.default.resolve("output", "ios-build", "ipa", "HostingApp.ipa");
        console.log("file", file);
        if (!fs_1.default.existsSync(file))
            throw new Error("no output generated");
        return file;
    }
    else if (bundleType == "keyboard_macos") {
        const macTarget = shared_1.loadKbdgenTarget(kbdgenPackagePath, "mac");
        const bundleName = macTarget["bundleName"];
        const version = macTarget["version"];
        if (!version)
            throw new Error("no version in mac target");
        const exit = await exec.exec("kbdgen", [
            "--logging", "trace",
            "build",
            "mac", "-R", "--ci", "-o", "output",
            kbdgenPackagePath
        ], {
            env: {
                ...process.env,
                "DEVELOPER_PASSWORD_CHAIN_ITEM": env.macos.passwordChainItem,
                "DEVELOPER_ACCOUNT": env.macos.developerAccount
            }
        });
        if (exit != 0) {
            throw new Error("kbdgen failed");
        }
        const file = path_1.default.resolve("output", `${bundleName} ${version}.pkg`);
        console.log("file", file);
        if (!fs_1.default.existsSync(file))
            throw new Error("no output generated");
        return file;
    }
    else if (bundleType == "keyboard_win") {
        const winTarget = shared_1.loadKbdgenTarget(kbdgenPackagePath, "win");
        const appName = winTarget["appName"];
        const version = winTarget["version"];
        if (!version)
            throw new Error("no version in win target");
        const exit = await exec.exec("kbdgen", [
            "--logging", "trace",
            "build",
            "win", "-R", "--ci", "-o", "output",
            kbdgenPackagePath
        ], {
            env: {
                ...process.env,
                "CODESIGN_PW": env.windows.pfxPassword,
                "CODESIGN_PFX": `${shared_1.divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
            }
        });
        if (exit != 0) {
            throw new Error("kbdgen failed");
        }
        const file = path_1.default.resolve("output", `${appName.replace(/ /g, "_")}_${version}.exe`);
        console.log("file", file);
        if (!fs_1.default.existsSync(file))
            throw new Error("no output generated");
        return file;
    }
}
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        const bundleType = core.getInput('bundleType');
        const bundle = manifest.bundles[bundleType];
        if (!bundle) {
            core.warning(`No bundle config specified for ${bundleType}`);
            return;
        }
        const spellerOutput = await bundleSpeller(manifest, bundleType) || await bundleKeyboard(manifest, bundleType);
        console.log("output", spellerOutput);
        if (spellerOutput) {
            core.setOutput("bundle", spellerOutput);
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
