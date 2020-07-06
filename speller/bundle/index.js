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
const io = __importStar(require("@actions/io"));
const path_1 = __importDefault(require("path"));
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const shared_1 = require("../../shared");
const manifest_1 = require("../manifest");
const lib_1 = require("../../inno-setup/lib");
const inno_1 = require("../../inno");
async function run() {
    const version = core.getInput("version", { required: true });
    const spellerType = core.getInput("speller-type", { required: true });
    const manifest = shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync(core.getInput("speller-manifest-path", { required: true }), "utf8")), true);
    const spellerPaths = shared_1.nonUndefinedProxy(JSON.parse(core.getInput("speller-paths", { required: true })), true);
    let { name } = manifest;
    const packageId = manifest_1.derivePackageId(spellerType);
    const langTag = manifest_1.deriveLangTag(false);
    if (spellerType == manifest_1.SpellerType.Mobile) {
        const bhfstPaths = [];
        for (const [langTag, zhfstPath] of Object.entries(spellerPaths.mobile)) {
            const bhfstPath = await shared_1.ThfstTools.zhfstToBhfst(zhfstPath);
            const langTagBhfst = `${path_1.default.dirname(bhfstPath)}/${langTag}.bhfst`;
            core.debug(`Copying ${bhfstPath} to ${langTagBhfst}`);
            await io.cp(bhfstPath, langTagBhfst);
            bhfstPaths.push(langTagBhfst);
        }
        const payloadPath = path_1.default.resolve(`./${packageId}_${version}_mobile.txz`);
        core.debug(`Creating txz from [${bhfstPaths.join(", ")}] at ${payloadPath}`);
        await shared_1.Tar.createFlatTxz(bhfstPaths, payloadPath);
        core.setOutput("payload-path", payloadPath);
    }
    else if (spellerType == manifest_1.SpellerType.Windows) {
        if (manifest.windows.system_product_code == null) {
            throw new Error("Missing system_product_code");
        }
        const builder = new inno_1.InnoSetupBuilder();
        builder.name(name)
            .version(version)
            .publisher("Universitetet i Tromsø - Norges arktiske universitet")
            .url("http://divvun.no/")
            .productCode(manifest.windows.system_product_code)
            .defaultDirName(`{commonpf}\\WinDivvun\\Spellers\\${langTag}`)
            .files(files => {
            const flags = ["ignoreversion", "recursesubdirs", "uninsrestartdelete"];
            for (const zhfstPath of Object.values(spellerPaths.desktop)) {
                files.add(zhfstPath, "{app}", flags);
            }
            return files;
        })
            .code(code => {
            if (manifest.windows.legacy_product_codes) {
                for (const productCode of manifest.windows.legacy_product_codes) {
                    code.uninstallLegacy(productCode, "nsis");
                }
            }
            code.execPostInstall("{commonpf}\\WinDivvun\\i686\\spelli.exe", `register -t ${langTag} -p "{commonpf}\\WinDivvun\\Spellers\\${langTag}\\${langTag}.zhfst"`, `Could not register speller for tag: ${langTag}`);
            code.execPreUninstall("{commonpf}\\WinDivvun\\i686\\spelli.exe", `register -t ${langTag}`, `Could not register speller for tag: ${langTag}`);
            if (manifest.windows.extra_locales) {
                for (const [tag, zhfstPrefix] of Object.entries(manifest.windows.extra_locales)) {
                    code.execPostInstall("{commonpf}\\WinDivvun\\i686\\spelli.exe", `register -t ${tag} -p "{commonpf}\\WinDivvun\\Spellers\\${langTag}\\${zhfstPrefix}.zhfst"`, `Could not register speller for tag: ${tag}`);
                    code.execPreUninstall("{commonpf}\\WinDivvun\\i686\\spelli.exe", `deregister -t ${tag}`, `Could not deregister speller for tag: ${tag}`);
                }
            }
            return code;
        })
            .write("./install.iss");
        const payloadPath = await lib_1.makeInstaller("./install.iss");
        core.setOutput("payload-path", payloadPath);
    }
    else if (spellerType == manifest_1.SpellerType.MacOS) {
        const payloadPath = await shared_1.DivvunBundler.bundleMacOS(name, version, packageId, langTag, spellerPaths);
        core.setOutput("payload-path", payloadPath);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
