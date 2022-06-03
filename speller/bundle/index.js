"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const path_1 = __importDefault(require("path"));
const toml_1 = __importDefault(require("@iarna/toml"));
const fs_1 = __importDefault(require("fs"));
const shared_1 = require("../../shared");
const manifest_1 = require("../manifest");
const lib_1 = require("../../inno-setup/lib");
const inno_1 = require("../../inno");
async function run() {
    const version = core.getInput("version", { required: true });
    const spellerType = core.getInput("speller-type", { required: true });
    const manifest = toml_1.default.parse(fs_1.default.readFileSync(core.getInput("speller-manifest-path", { required: true }), "utf8"));
    const spellerPaths = (0, shared_1.nonUndefinedProxy)(JSON.parse(core.getInput("speller-paths", { required: true })), true);
    let { name } = manifest;
    const packageId = (0, manifest_1.derivePackageId)(spellerType);
    const langTag = (0, manifest_1.deriveLangTag)(false);
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
        const zhfstPaths = [];
        fs_1.default.mkdirSync("./zhfst");
        for (const [key, value] of Object.entries(spellerPaths.desktop)) {
            const out = path_1.default.resolve(path_1.default.join("./zhfst", `${key}.zhfst`));
            fs_1.default.renameSync(value, out);
            zhfstPaths.push(out);
        }
        const builder = new inno_1.InnoSetupBuilder();
        builder.name(`${name} Speller`)
            .version(version)
            .publisher("Universitetet i Tromsø - Norges arktiske universitet")
            .url("http://divvun.no/")
            .productCode(manifest.windows.system_product_code)
            .defaultDirName(`{commonpf}\\WinDivvun\\Spellers\\${langTag}`)
            .files(files => {
            const flags = ["ignoreversion", "recursesubdirs", "uninsrestartdelete"];
            for (const zhfstPath of zhfstPaths) {
                files.add(zhfstPath, "{app}", flags);
            }
            files.add("speller.toml", "{app}", flags);
            return files;
        })
            .code(code => {
            if (manifest.windows.legacy_product_codes) {
                for (const productCode of manifest.windows.legacy_product_codes) {
                    code.uninstallLegacy(productCode.value, productCode.kind);
                }
            }
            const spellerToml = {
                spellers: {
                    [langTag]: `${langTag}.zhfst`
                }
            };
            if (manifest.windows.extra_locales) {
                for (const [tag, zhfstPrefix] of Object.entries(manifest.windows.extra_locales)) {
                    spellerToml.spellers[tag] = `${zhfstPrefix}.zhfst`;
                }
            }
            core.debug("Writing speller.toml:");
            core.debug(toml_1.default.stringify(spellerToml));
            fs_1.default.writeFileSync("./speller.toml", toml_1.default.stringify(spellerToml), "utf8");
            code.execPostInstall("{commonpf}\\WinDivvun\\i686\\spelli.exe", `refresh`, `Could not refresh spellers. Is WinDivvun installed?`);
            code.execPostUninstall("{commonpf}\\WinDivvun\\i686\\spelli.exe", `refresh`, `Could not refresh spellers. Is WinDivvun installed?`);
            return code;
        })
            .write("./install.iss");
        core.debug("generated install.iss:");
        core.debug(builder.build());
        const payloadPath = await (0, lib_1.makeInstaller)("./install.iss");
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
