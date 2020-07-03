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
const exec_1 = require("@actions/exec");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const tc = __importStar(require("@actions/tool-cache"));
const io = __importStar(require("@actions/io"));
const glob = __importStar(require("@actions/glob"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const tmp = __importStar(require("tmp"));
const action_1 = require("@octokit/action");
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
exports.DIVVUN_PFX = `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`;
let loadedSecrets = null;
function secrets() {
    if (loadedSecrets != null) {
        return loadedSecrets;
    }
    const p = path_1.default.resolve(divvunConfigDir(), "enc", "env.json");
    const s = fs_1.default.readFileSync(p, "utf8");
    const secrets = JSON.parse(s);
    function walk(obj) {
        if (obj !== null && typeof obj == "object") {
            for (const value of Object.values(obj)) {
                walk(value);
            }
        }
        else {
            core.setSecret(obj);
        }
    }
    walk(secrets);
    loadedSecrets = nonUndefinedProxy(secrets, true);
    return loadedSecrets;
}
exports.secrets = secrets;
function env() {
    return {
        ...process.env,
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        DEBIAN_FRONTEND: "noninteractive",
        DEBCONF_NONINTERACTIVE_SEEN: "true"
    };
}
function assertExit0(code) {
    if (code !== 0) {
        core.setFailed(`Process exited with exit code ${code}.`);
    }
}
class Apt {
    static async update(requiresSudo) {
        if (requiresSudo) {
            assertExit0(await exec_1.exec("sudo", ["apt-get", "-qy", "update"], { env: env() }));
        }
        else {
            assertExit0(await exec_1.exec("apt-get", ["-qy", "update"], { env: env() }));
        }
    }
    static async install(packages, requiresSudo) {
        if (requiresSudo) {
            assertExit0(await exec_1.exec("sudo", ["apt-get", "install", "-qfy", ...packages], { env: env() }));
        }
        else {
            assertExit0(await exec_1.exec("apt-get", ["install", "-qfy", ...packages], { env: env() }));
        }
    }
}
exports.Apt = Apt;
class Pip {
    static async install(packages, requiresSudo) {
        if (requiresSudo) {
            assertExit0(await exec_1.exec("sudo", ["pip3", "install", ...packages], { env: env() }));
        }
        else {
            assertExit0(await exec_1.exec("pip3", ["install", ...packages], { env: env() }));
        }
    }
}
exports.Pip = Pip;
class Powershell {
    static async runScript(script, opts = {}) {
        const thisEnv = Object.assign({}, env(), opts.env);
        const out = [];
        const err = [];
        const listeners = {
            stdout: (data) => {
                out.push(data.toString());
            },
            stderr: (data) => {
                err.push(data.toString());
            }
        };
        assertExit0(await exec_1.exec("pwsh", ["-c", script], { env: thisEnv, cwd: opts.cwd, listeners }));
        return [out.join(""), err.join("")];
    }
}
exports.Powershell = Powershell;
class Bash {
    static async runScript(script, args = {}) {
        const thisEnv = Object.assign({}, env(), args.env);
        const out = [];
        const err = [];
        core.debug("PATH:");
        core.debug(process.env.PATH);
        try {
            const paths = fs_1.default.readdirSync(path_1.default.join(PahkatPrefix.path, "pkg"));
            core.debug(`Paths in prefix: ${paths.join(", ")}`);
        }
        catch (e) {
            core.debug("Error getting pahkat prefix");
            core.debug(e);
        }
        const listeners = {
            stdout: (data) => {
                out.push(data.toString());
            },
            stderr: (data) => {
                err.push(data.toString());
            }
        };
        if (process.platform === 'win32') {
            core.debug("DETECTED WIN32 EXPERIENCE, TIME TO SHINE");
            assertExit0(await exec_1.exec("pwsh", ["-c", script], { env: thisEnv, cwd: args.cwd, listeners }));
            return [out.join(""), err.join("")];
        }
        if (args.sudo) {
            assertExit0(await exec_1.exec("sudo", ["bash", "-c", script], { env: thisEnv, cwd: args.cwd, listeners }));
        }
        else {
            assertExit0(await exec_1.exec("bash", ["-c", script], { env: thisEnv, cwd: args.cwd, listeners }));
        }
        return [out.join(""), err.join("")];
    }
}
exports.Bash = Bash;
class Tar {
    static async bootstrap() {
        if (process.platform !== "win32") {
            return;
        }
        const outputPath = path_1.default.join(process.env.RUNNER_WORKSPACE, "bin_x86-64");
        if (fs_1.default.existsSync(path_1.default.join(outputPath, "xz.exe"))) {
            return;
        }
        core.debug("Attempt to download xz tools");
        const xzToolsZip = await tc.downloadTool(Tar.URL_XZ_WINDOWS);
        await tc.extractZip(xzToolsZip, process.env.RUNNER_WORKSPACE);
        core.addPath(outputPath);
    }
    static async createFlatTxz(paths, outputPath) {
        const tmpDir = tmp.dirSync();
        const stagingDir = path_1.default.join(tmpDir.name, "staging");
        fs_1.default.mkdirSync(stagingDir);
        core.debug(`Created tmp dir: ${tmpDir.name}`);
        for (const p of paths) {
            core.debug(`Copying ${p} into ${stagingDir}`);
            await io.cp(p, stagingDir, { recursive: true });
        }
        core.debug(`Tarring`);
        await Bash.runScript(`tar cf ../file.tar *`, { cwd: stagingDir });
        core.debug("xz -9'ing");
        await Bash.runScript(`xz -9 ../file.tar`, { cwd: stagingDir });
        core.debug("Copying file.tar.xz to " + outputPath);
        await io.cp(path_1.default.join(tmpDir.name, "file.tar.xz"), outputPath);
    }
}
exports.Tar = Tar;
Tar.URL_XZ_WINDOWS = "https://tukaani.org/xz/xz-5.2.5-windows.zip";
var RebootSpec;
(function (RebootSpec) {
    RebootSpec["Install"] = "install";
    RebootSpec["Uninstall"] = "uninstall";
    RebootSpec["Update"] = "update";
})(RebootSpec = exports.RebootSpec || (exports.RebootSpec = {}));
var WindowsExecutableKind;
(function (WindowsExecutableKind) {
    WindowsExecutableKind["Inno"] = "inno";
    WindowsExecutableKind["Nsis"] = "nsis";
    WindowsExecutableKind["Msi"] = "msi";
})(WindowsExecutableKind = exports.WindowsExecutableKind || (exports.WindowsExecutableKind = {}));
class PahkatPrefix {
    static get path() {
        return path_1.default.join(process.env.RUNNER_WORKSPACE, "pahkat-prefix");
    }
    static async bootstrap() {
        const platform = process.platform;
        const binPath = path_1.default.resolve(path_1.default.join(process.env.RUNNER_WORKSPACE, "bin"));
        core.addPath(binPath);
        console.log(`Bin path: ${binPath}, platform: ${process.platform}`);
        if (platform === "linux") {
            const txz = await tc.downloadTool(PahkatPrefix.URL_LINUX);
            console.log(await tc.extractTar(txz, process.env.RUNNER_WORKSPACE, "Jx"));
        }
        else if (platform === "darwin") {
            const txz = await tc.downloadTool(PahkatPrefix.URL_MACOS);
            console.log(await tc.extractTar(txz, process.env.RUNNER_WORKSPACE));
        }
        else if (platform === "win32") {
            await Tar.bootstrap();
            const txz = await tc.downloadTool(PahkatPrefix.URL_WINDOWS, path_1.default.join(process.env.RUNNER_WORKSPACE, "pahkat-dl.txz"));
            core.debug("Attempt to unxz");
            await exec_1.exec("xz", ["-d", txz]);
            core.debug("Attempted to extract tarball");
            console.log(await tc.extractTar(`${path_1.default.dirname(txz)}\\${path_1.default.basename(txz, ".txz")}.tar`, process.env.RUNNER_WORKSPACE));
        }
        else {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        await Bash.runScript(`pahkat-prefix-cli init -c ${PahkatPrefix.path}`);
    }
    static async addRepo(url, channel) {
        if (channel != null) {
            await Bash.runScript(`pahkat-prefix-cli config repo add -c ${PahkatPrefix.path} ${url} ${channel}`);
        }
        else {
            await Bash.runScript(`pahkat-prefix-cli config repo add -c ${PahkatPrefix.path} ${url}`);
        }
    }
    static async install(packages) {
        await Bash.runScript(`pahkat-prefix-cli install ${packages.join(" ")} -c ${PahkatPrefix.path}`);
        for (const pkg of packages) {
            core.addPath(path_1.default.join(PahkatPrefix.path, "pkg", pkg, "bin"));
        }
    }
}
exports.PahkatPrefix = PahkatPrefix;
PahkatPrefix.URL_LINUX = "https://pahkat.uit.no/artifacts/pahkat-prefix-cli_0.1.0_linux_amd64.txz";
PahkatPrefix.URL_MACOS = "https://pahkat.uit.no/artifacts/pahkat-prefix-cli_0.1.0_macos_amd64.txz";
PahkatPrefix.URL_WINDOWS = "https://pahkat.uit.no/artifacts/pahkat-prefix-cli_0.1.0_windows_amd64.txz";
var MacOSPackageTarget;
(function (MacOSPackageTarget) {
    MacOSPackageTarget["System"] = "system";
    MacOSPackageTarget["User"] = "user";
})(MacOSPackageTarget = exports.MacOSPackageTarget || (exports.MacOSPackageTarget = {}));
class PahkatUploader {
    static async run(args) {
        const sec = secrets();
        let output = "";
        core.debug("PATH:");
        core.debug(process.env.PATH);
        let exe;
        if (process.platform === "win32") {
            exe = "pahkat-uploader.exe";
        }
        else {
            exe = "pahkat-uploader";
        }
        assertExit0(await exec_1.exec(exe, args, {
            env: Object.assign({}, env(), {
                PAHKAT_API_KEY: sec.pahkat.apiKey
            }),
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                }
            }
        }));
        return output;
    }
    static async upload(payloadPath, payloadManifestPath, manifest) {
        if (!fs_1.default.existsSync(payloadManifestPath)) {
            throw new Error(`Missing required payload manifest at path ${payloadManifestPath}`);
        }
        const payloadUrl = `${PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(payloadPath)}`;
        await Subversion.import(payloadPath, payloadUrl);
        const args = ["upload",
            "-u", manifest.url,
            "-v", manifest.version,
            "-p", manifest.platform,
            "-P", payloadManifestPath,
        ];
        if (manifest.channel) {
            args.push("-c");
            args.push(manifest.channel);
        }
        if (manifest.arch) {
            args.push("-a");
            args.push(manifest.arch);
        }
        console.log(await PahkatUploader.run(args));
    }
}
exports.PahkatUploader = PahkatUploader;
PahkatUploader.ARTIFACTS_URL = "https://pahkat.uit.no/artifacts/";
PahkatUploader.payload = {
    async windowsExecutable(installSize, size, kind, productCode, requiresReboot, payloadPath) {
        const payloadUrl = `${PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(payloadPath)}`;
        const args = [
            "payload", "windows-executable",
            "-i", (installSize | 0).toString(),
            "-s", (size | 0).toString(),
            "-p", productCode,
            "-u", payloadUrl
        ];
        if (kind != null) {
            args.push("-k");
            args.push(kind);
        }
        if (requiresReboot.length > 0) {
            args.push("-r");
            args.push(requiresReboot.join(","));
        }
        return await PahkatUploader.run(args);
    },
    async macosPackage(installSize, size, pkgId, requiresReboot, targets, payloadPath) {
        const payloadUrl = `${PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(payloadPath)}`;
        const args = [
            "payload", "macos-package",
            "-i", (installSize | 0).toString(),
            "-s", (size | 0).toString(),
            "-p", pkgId,
            "-u", payloadUrl
        ];
        if (targets.length > 0) {
            args.push("-t");
            args.push(targets.join(","));
        }
        if (requiresReboot.length > 0) {
            args.push("-r");
            args.push(requiresReboot.join(","));
        }
        return await PahkatUploader.run(args);
    },
    async tarballPackage(installSize, size, payloadPath) {
        const payloadUrl = `${PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(payloadPath)}`;
        const args = [
            "payload", "tarball-package",
            "-i", (installSize | 0).toString(),
            "-s", (size | 0).toString(),
            "-u", payloadUrl
        ];
        return await PahkatUploader.run(args);
    },
};
const CLEAR_KNOWN_HOSTS_SH = `\
mkdir -pv ~/.ssh
ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
cat ~/.ssh/known_hosts | sort | uniq > ~/.ssh/known_hosts.new
mv ~/.ssh/known_hosts.new ~/.ssh/known_hosts
`;
class Ssh {
    static async cleanKnownHosts() {
        await Bash.runScript(CLEAR_KNOWN_HOSTS_SH);
    }
}
exports.Ssh = Ssh;
const PROJECTJJ_NIGHTLY_SH = `\
wget -q https://apertium.projectjj.com/apt/install-nightly.sh -O install-nightly.sh && bash install-nightly.sh
`;
class ProjectJJ {
    static async addNightlyToApt(requiresSudo) {
        await Bash.runScript(PROJECTJJ_NIGHTLY_SH, { sudo: requiresSudo });
    }
}
exports.ProjectJJ = ProjectJJ;
class Kbdgen {
    static async fetchMetaBundle(metaBundlePath) {
        const metaFilePath = path_1.default.join(metaBundlePath, "meta.toml");
        await Bash.runScript(`kbdgen meta fetch ${metaBundlePath} -c ${metaFilePath}`);
    }
    static async resolveOutput(p) {
        const globber = await glob.create(p, {
            followSymbolicLinks: false
        });
        const files = await globber.glob();
        if (files[0] == null) {
            throw new Error("No output found for build.");
        }
        core.debug("Got file for bundle: " + files[0]);
        return files[0];
    }
    static loadTarget(bundlePath, target) {
        return nonUndefinedProxy(yaml_1.default.parse(fs_1.default.readFileSync(path_1.default.resolve(bundlePath, "targets", `${target}.yaml`), 'utf8')), true);
    }
    static async setNightlyVersion(bundlePath, target) {
        const targetData = Kbdgen.loadTarget(bundlePath, target);
        targetData['version'] = await versionAsNightly(targetData['version']);
        fs_1.default.writeFileSync(path_1.default.resolve(bundlePath, "targets", `${target}.yaml`), yaml_1.default.stringify({ ...targetData }), 'utf8');
        return targetData['version'];
    }
    static setBuildNumber(bundlePath, target, start = 0) {
        const targetData = Kbdgen.loadTarget(bundlePath, target);
        targetData['build'] = start + parseInt(process.env.GITHUB_RUN_NUMBER, 10);
        core.debug("Set build number to " + targetData['build']);
        fs_1.default.writeFileSync(path_1.default.resolve(bundlePath, "targets", `${target}.yaml`), yaml_1.default.stringify({ ...targetData }), 'utf8');
        return targetData['build'];
    }
    static async build_iOS(bundlePath) {
        const abs = path_1.default.resolve(bundlePath);
        const cwd = path_1.default.dirname(abs);
        const sec = secrets();
        await Bash.runScript("brew install imagemagick");
        const env = {
            "GITHUB_USERNAME": sec.github.username,
            "GITHUB_TOKEN": sec.github.token,
            "MATCH_GIT_URL": sec.ios.matchGitUrl,
            "MATCH_PASSWORD": sec.ios.matchPassword,
            "FASTLANE_USER": sec.ios.fastlaneUser,
            "PRODUCE_USERNAME": sec.ios.fastlaneUser,
            "FASTLANE_PASSWORD": sec.ios.fastlanePassword,
            "MATCH_KEYCHAIN_NAME": "fastlane_tmp_keychain",
            "MATCH_KEYCHAIN_PASSWORD": ""
        };
        await Bash.runScript(`kbdgen --logging debug build ios ${abs} init`, {
            cwd,
            env
        });
        await Bash.runScript(`kbdgen --logging debug build ios -R --ci --kbd-branch master -o output ${abs}`, {
            cwd,
            env
        });
        const output = path_1.default.resolve(cwd, "output/ios-build/ipa/HostingApp.ipa");
        if (!fs_1.default.existsSync(output)) {
            throw new Error("No output found for build.");
        }
        return output;
    }
    static async buildAndroid(bundlePath) {
        const abs = path_1.default.resolve(bundlePath);
        const cwd = path_1.default.dirname(abs);
        const sec = secrets();
        await Bash.runScript(`kbdgen --logging debug build android -R --ci -o output ${abs}`, {
            cwd,
            env: {
                "GITHUB_USERNAME": sec.github.username,
                "GITHUB_TOKEN": sec.github.token,
                "NDK_HOME": process.env.ANDROID_NDK_HOME,
                "ANDROID_KEYSTORE": path_1.default.join(divvunConfigDir(), sec.android.keystore),
                "ANDROID_KEYALIAS": sec.android.keyalias,
                "STORE_PW": sec.android.storePassword,
                "KEY_PW": sec.android.keyPassword,
                "PLAY_STORE_P12": path_1.default.join(divvunConfigDir(), sec.android.playStoreP12),
                "PLAY_STORE_ACCOUNT": sec.android.playStoreAccount
            }
        });
        return await Kbdgen.resolveOutput(path_1.default.join(cwd, "output", `*_release.apk`));
    }
    static async buildMacOS(bundlePath) {
        const abs = path_1.default.resolve(bundlePath);
        const cwd = path_1.default.dirname(abs);
        const sec = secrets();
        await Bash.runScript("brew install imagemagick");
        await Bash.runScript(`kbdgen --logging debug build mac -R --ci -o output ${abs}`, {
            env: {
                "DEVELOPER_PASSWORD_CHAIN_ITEM": sec.macos.passwordChainItem,
                "DEVELOPER_ACCOUNT": sec.macos.developerAccount
            }
        });
        return await Kbdgen.resolveOutput(path_1.default.join(cwd, "output", `*.pkg`));
    }
    static async buildWindows(bundlePath) {
        const abs = path_1.default.resolve(bundlePath);
        const cwd = path_1.default.dirname(abs);
        const sec = secrets();
        const msklcZip = await tc.downloadTool("https://pahkat.uit.no/artifacts/msklc.zip");
        const msklcPath = await tc.extractZip(msklcZip);
        core.exportVariable("MSKLC_PATH", path_1.default.join(msklcPath, "msklc1.4"));
        await Bash.runScript(`kbdgen --logging debug build win -R --ci -o output ${abs}`, {
            env: {
                "CODESIGN_PW": sec.windows.pfxPassword,
                "CODESIGN_PFX": exports.DIVVUN_PFX,
            }
        });
        const globber = await glob.create(path_1.default.join(cwd, "output", `*.exe`), {
            followSymbolicLinks: false
        });
        const files = await globber.glob();
        for (const file of files) {
            if (file.includes("win7") || file.includes("kbdi")) {
                continue;
            }
            core.debug("Got file for bundle: " + file);
            return file;
        }
        throw new Error("No output found for build.");
    }
}
exports.Kbdgen = Kbdgen;
class Subversion {
    static async import(payloadPath, remotePath) {
        const sec = secrets();
        const msg = `[CI: Artifact] ${path_1.default.basename(payloadPath)}`;
        return await Bash.runScript(`svn import ${payloadPath} ${remotePath} -m "${msg}" --username="${sec.svn.username}" --password="${sec.svn.password}"`);
    }
}
exports.Subversion = Subversion;
class ThfstTools {
    static async zhfstToBhfst(zhfstPath) {
        await Bash.runScript(`thfst-tools zhfst-to-bhfst ${zhfstPath}`);
        return `${path_1.default.basename(zhfstPath, ".zhfst")}.bhfst`;
    }
}
exports.ThfstTools = ThfstTools;
async function versionAsNightly(version) {
    if (version.includes("-")) {
        throw new Error(`Version already includes pre-release segment: ${version}`);
    }
    const octokit = new action_1.Octokit();
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    const { data } = await octokit.request("GET /repos/:owner/:repo/actions/runs/:run_id", {
        owner,
        repo,
        run_id: parseInt(process.env.GITHUB_RUN_ID, 10)
    });
    const nightlyTs = data.created_at.replace(/[-:\.]/g, "");
    return `${version}-nightly.${nightlyTs}`;
}
exports.versionAsNightly = versionAsNightly;
function deriveBundlerArgs(spellerPaths, withZhfst = true) {
    const args = [];
    for (const [langTag, zhfstPath] of Object.entries(spellerPaths.desktop)) {
        args.push("-l");
        args.push(langTag);
        if (withZhfst) {
            args.push("-z");
            args.push(zhfstPath);
        }
    }
    return args;
}
class DivvunBundler {
    static async bundleMacOS(name, version, packageId, langTag, spellerPaths) {
        const sec = secrets();
        const args = [
            "-R", "-o", "output", "-t", "osx",
            "-H", name,
            "-V", version,
            "-a", `Developer ID Application: The University of Tromso (2K5J2584NX)`,
            "-i", `Developer ID Installer: The University of Tromso (2K5J2584NX)`,
            "-n", sec.macos.developerAccount,
            "-p", sec.macos.appPassword,
            "speller",
            "-f", langTag,
            ...deriveBundlerArgs(spellerPaths)
        ];
        assertExit0(await exec_1.exec("divvun-bundler", args, {
            env: Object.assign({}, env(), {
                "RUST_LOG": "trace"
            })
        }));
        await io.cp(path_1.default.resolve(`output/${langTag}-${version}.pkg`), path_1.default.resolve(`output/${packageId}-${version}.pkg`));
        const outputFile = path_1.default.resolve(`output/${packageId}-${version}.pkg`);
        return outputFile;
    }
    static async bundleWindows(name, version, productCode, packageId, langTag, spellerPaths) {
        const sec = secrets();
        let exe;
        if (process.platform === "win32") {
            exe = path_1.default.join(PahkatPrefix.path, "pkg", "divvun-bundler", "bin", "divvun-bundler.exe");
        }
        else {
            exe = "divvun-bundler";
        }
        const args = ["-R", "-t", "win", "-o", "output",
            "--uuid", productCode,
            "-H", name,
            "-V", version,
            "-c", exports.DIVVUN_PFX,
            "speller",
            "-f", langTag,
            ...deriveBundlerArgs(spellerPaths)
        ];
        assertExit0(await exec_1.exec(exe, args, {
            env: Object.assign({}, env(), {
                "RUST_LOG": "trace",
                "SIGN_PFX_PASSWORD": sec.windows.pfxPassword,
            })
        }));
        try {
            core.debug(fs_1.default.readdirSync("output").join(", "));
        }
        catch (err) {
            core.debug("Failed to read output dir");
            core.debug(err);
        }
        await io.cp(path_1.default.resolve(`output/${langTag}-${version}.exe`), path_1.default.resolve(`output/${packageId}-${version}.exe`));
        return path_1.default.resolve(`output/${packageId}-${version}.exe`);
    }
    static async bundleWindowsMSOffice(name, version, productCode, packageId, langTag, spellerPaths) {
        const sec = secrets();
        let exe;
        if (process.platform === "win32") {
            exe = path_1.default.join(PahkatPrefix.path, "pkg", "divvun-bundler", "bin", "divvun-bundler.exe");
        }
        else {
            exe = "divvun-bundler";
        }
        const args = ["-R", "-t", "win", "-o", "output",
            "--uuid", productCode,
            "-H", `${name} MS Office`,
            "-V", version,
            "-c", exports.DIVVUN_PFX,
            "speller_mso",
            "-f", langTag,
            "--reg", path_1.default.join(PahkatPrefix.path, "pkg", "win-reg-tool", "bin", "win-reg-tool.exe"),
            ...deriveBundlerArgs(spellerPaths, false)
        ];
        assertExit0(await exec_1.exec(exe, args, {
            env: Object.assign({}, env(), {
                "RUST_LOG": "trace",
                "SIGN_PFX_PASSWORD": sec.windows.pfxPassword,
            })
        }));
        try {
            core.debug(fs_1.default.readdirSync("output").join(", "));
        }
        catch (err) {
            core.debug("Failed to read output dir");
            core.debug(err);
        }
        await io.cp(path_1.default.resolve(`output/${langTag}-mso-${version}.exe`), path_1.default.resolve(`output/${packageId}-${version}.exe`));
        return `output/${packageId}-${version}.exe`;
    }
}
exports.DivvunBundler = DivvunBundler;
function nonUndefinedProxy(obj, withNull = false) {
    return new Proxy(obj, {
        get: (target, prop, receiver) => {
            const v = Reflect.get(target, prop, receiver);
            if (v === undefined) {
                throw new Error(`'${String(prop)}' was undefined and this is disallowed. Available keys: ${Object.keys(obj).join(", ")}`);
            }
            if (withNull && v === null) {
                throw new Error(`'${String(prop)}' was null and this is disallowed. Available keys: ${Object.keys(obj).join(", ")}`);
            }
            if (v != null && (Array.isArray(v) || typeof v === 'object')) {
                return nonUndefinedProxy(v, withNull);
            }
            else {
                return v;
            }
        }
    });
}
exports.nonUndefinedProxy = nonUndefinedProxy;
function validateProductCode(kind, code) {
    if (kind === null) {
        core.debug("Found no kind, returning original code");
        return code;
    }
    if (kind === WindowsExecutableKind.Inno) {
        if (code.startsWith("{") && code.endsWith("}_is1")) {
            core.debug("Found valid product code for Inno installer: " + code);
            return code;
        }
        let updatedCode = code;
        if (!code.endsWith("}_is1") && !code.startsWith("{")) {
            core.debug("Found plain UUID for Inno installer, wrapping in {...}_is1");
            updatedCode = `{${code}}_is1`;
        }
        else if (code.endsWith("}") && code.startsWith("{")) {
            core.debug("Found wrapped GUID for Inno installer, appending _is1");
            updatedCode += "_is1";
        }
        else {
            throw new Error(`Could not handle invalid Inno product code: ${code}`);
        }
        core.debug(`'${code}' -> '${updatedCode}`);
        return updatedCode;
    }
    if (kind === WindowsExecutableKind.Nsis) {
        if (code.startsWith("{") && code.endsWith("}")) {
            core.debug("Found valid product code for Nsis installer: " + code);
            return code;
        }
        let updatedCode = code;
        if (!code.endsWith("}") && !code.startsWith("{")) {
            core.debug("Found plain UUID for Nsis installer, wrapping in {...}");
            updatedCode = `{${code}}`;
        }
        else {
            throw new Error(`Could not handle invalid Nsis product code: ${code}`);
        }
        core.debug(`'${code}' -> '${updatedCode}`);
        return updatedCode;
    }
    throw new Error("Unhandled kind: " + kind);
}
exports.validateProductCode = validateProductCode;
function isCurrentBranch(names) {
    const value = process.env.GITHUB_REF;
    core.debug(`names: ${names}`);
    core.debug(`GITHUB_REF: '${value}'`);
    if (value == null) {
        return false;
    }
    for (const name of names) {
        if (value === `refs/heads/${name}`) {
            return true;
        }
    }
    return false;
}
exports.isCurrentBranch = isCurrentBranch;
