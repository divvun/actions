"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../shared");
async function downloadAppleWWDRCA() {
    return await tc.downloadTool("https://developer.apple.com/certificationauthority/AppleWWDRCA.cer");
}
class Security {
    constructor() { throw new Error("cannot be instantiated"); }
    static async run(subcommand, args) {
        return await shared_1.Bash.runScript(`security ${subcommand} ${args.join(" ")}`);
    }
    static async deleteKeychain(name) {
        return await Security.run("delete-keychain", [`${name}.keychain`]);
    }
    static async createKeychain(name, password) {
        core.setSecret(password);
        return await Security.run("create-keychain", ["-p", `"${password}"`, `${name}.keychain`]);
    }
    static async defaultKeychain(name) {
        return await Security.run("default-keychain", ["-s", `${name}.keychain`]);
    }
    static async unlockKeychain(name, password) {
        core.setSecret(password);
        return await Security.run("unlock-keychain", ["-p", `"${password}"`, `${name}.keychain`]);
    }
    static async setKeychainTimeout(name, timeout) {
        const intTimeout = (timeout | 0).toString();
        return await Security.run("set-keychain-settings", ["-t", intTimeout, "-u", `${name}.keychain`]);
    }
    static async import(keychainName, certOrKeyPath, keyPassword) {
        if (keyPassword != null) {
            core.setSecret(keyPassword);
            return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-P", `"${keyPassword}"`, "-A"]);
        }
        else {
            return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-A"]);
        }
    }
    static async setKeyPartitionList(keychainName, password, partitionList) {
        core.setSecret(password);
        return await Security.run("set-key-partition-list", ["-S", partitionList.join(","), "-s", "-k", `"${password}"`, `${keychainName}.keychain`]);
    }
}
function debug(input) {
    const [out, err] = input;
    if (out.trim() != '') {
        core.debug(out);
    }
    if (err.trim() != '') {
        core.error(err);
    }
}
async function setupMacOSKeychain() {
    const sec = shared_1.secrets();
    const name = `divvun-build-${shared_1.randomHexBytes(6)}`;
    const password = shared_1.randomString64();
    try {
        debug(await Security.deleteKeychain(name));
    }
    catch (_) { }
    debug(await Security.createKeychain(name, password));
    debug(await Security.defaultKeychain(name));
    debug(await Security.unlockKeychain(name, password));
    debug(await Security.setKeychainTimeout(name, 36000));
    const certPath = await downloadAppleWWDRCA();
    debug(await Security.import(name, certPath));
    debug(await Security.import(name, path_1.default.resolve(shared_1.divvunConfigDir(), sec.macos.appCer)));
    debug(await Security.import(name, path_1.default.resolve(shared_1.divvunConfigDir(), sec.macos.installerCer)));
    debug(await Security.import(name, path_1.default.resolve(shared_1.divvunConfigDir(), sec.macos.installerP12), sec.macos.installerP12Password));
    debug(await Security.import(name, path_1.default.resolve(shared_1.divvunConfigDir(), sec.macos.appP12), sec.macos.appP12Password));
    debug(await Security.setKeyPartitionList(name, password, ["apple-tool:", "apple:", "codesign:"]));
    debug(await shared_1.Bash.runScript(`xcrun altool --store-password-in-keychain-item "${sec.macos.passwordChainItem}" -u "${sec.macos.developerAccount}" -p "${sec.macos.appPassword}"`));
    debug(await shared_1.Bash.runScript(`bash ${shared_1.divvunConfigDir()}/enc/install.sh`));
}
async function cloneConfigRepo(password) {
    core.setSecret(password);
    const dir = shared_1.tmpDir();
    await shared_1.Bash.runScript("git clone --depth=1 https://github.com/divvun/divvun-ci-config.git", { cwd: dir });
    const repoDir = shared_1.divvunConfigDir();
    await shared_1.Bash.runScript(`openssl aes-256-cbc -d -in ./config.txz.enc -pass pass:${password} -out config.txz -md md5`, { cwd: repoDir });
    await shared_1.Tar.bootstrap();
    await shared_1.Tar.extractTxz(path_1.default.resolve(repoDir, "config.txz"), repoDir);
}
async function bootstrapDependencies() {
    core.debug("Installing subversion");
    debug(await shared_1.Bash.runScript("brew install subversion"));
}
async function run() {
    try {
        const divvunKey = core.getInput("key", { required: true });
        core.setSecret(divvunKey);
        console.log("Setting up environment");
        await cloneConfigRepo(divvunKey);
        if (process.platform === "win32") {
            core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool");
        }
        else if (process.platform == "darwin") {
            await setupMacOSKeychain();
            await bootstrapDependencies();
        }
        core.exportVariable("DIVVUN_CI_CONFIG", shared_1.divvunConfigDir());
        core.debug(shared_1.divvunConfigDir());
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
