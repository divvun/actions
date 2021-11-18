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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const inno_1 = require("../../inno");
const shared_1 = require("../../shared");
const uuid_1 = require("uuid");
const core = __importStar(require("@actions/core"));
const KBDGEN_NAMESPACE = (0, uuid_1.v5)("divvun.no", uuid_1.v5.DNS);
function layoutTarget(layout) {
    const targets = layout["targets"] || {};
    return targets["win"] || {};
}
function getKbdId(locale, layout) {
    if ("id" in layout) {
        return "kbd" + layout["id"];
    }
    return "kbd" + locale.replace(/[^A-Za-z0-9-]/g, "").substr(0, 5);
}
async function generateInnoFromBundle(bundlePath, buildDir) {
    var bundle = shared_1.Kbdgen.loadTarget(bundlePath, "win");
    var project = shared_1.Kbdgen.loadProjectBundle(bundlePath);
    var layouts = await shared_1.Kbdgen.loadLayouts(bundlePath);
    var builder = new inno_1.InnoSetupBuilder();
    builder.name(bundle.appName)
        .publisher(project.organisation)
        .version(bundle.version)
        .url(bundle.url)
        .productCode(bundle.uuid)
        .defaultDirName("{pf}\\" + bundle.appName)
        .files((builder) => {
        builder.add(`${buildDir}\\kbdi.exe`, "{app}", ["restartreplace", "uninsrestartdelete", "ignoreversion"]);
        builder.add(`${buildDir}\\i386\\*`, "{sys}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "not Is64BitInstallMode");
        builder.add(`${buildDir}\\amd64\\*`, "{sys}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode");
        builder.add(`${buildDir}\\wow64\\*`, "{wow64}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode");
        return builder;
    });
    for (const [locale, layout] of Object.entries(layouts)) {
        if ("win" in layout.modes || "desktop" in layout.modes) {
            addLayoutToInstaller(builder, locale, layout);
        }
    }
    const fileName = path_1.default.join(buildDir, `install.all.iss`);
    fs_1.default.writeFileSync(fileName, builder.build());
}
function addLayoutToInstaller(builder, locale, layout) {
    const target = layoutTarget(layout);
    const kbdId = getKbdId(locale, target);
    const dllName = kbdId + ".dll";
    const languageCode = target["locale"] || locale;
    const languageName = target["languageName"];
    const layoutDisplayName = layout["displayNames"][locale];
    const guidStr = (0, uuid_1.v5)(kbdId, KBDGEN_NAMESPACE);
    if (!layoutDisplayName) {
        throw new Error(`Display name for ${locale} not found`);
    }
    builder.run((builder) => {
        builder.withFilename("{app}\\kbdi.exe")
            .withParameter("keyboard_install")
            .withParameter(`-t ""${languageCode}""`);
        if (languageName) {
            builder.withParameter(`-l ""${languageName}""`);
        }
        builder.withParameter(`-g ""{${guidStr}""`)
            .withParameter(`-d ${dllName}`)
            .withParameter(`-n ${layoutDisplayName}`)
            .withParameter("-e")
            .withFlags(["runhidden", "waituntilterminated"]);
        return builder;
    })
        .uninstallRun((builder) => {
        builder.withFilename("{app}\\kbdi.exe")
            .withParameter("keyboard_uninstall")
            .withParameter(`""${guidStr}""`)
            .withFlags(["runhidden", "waituntilterminated"]);
        return builder;
    })
        .icons((builder) => {
        builder.withName(`{group}\\{cm:Enable,${layoutDisplayName}}`)
            .withFilename("{app}\\kbdi.exe")
            .withParameter("keyboard_enable")
            .withParameter(`-g ""{${guidStr}""`)
            .withParameter(`-t ${languageCode}`)
            .withFlags(["runminimized", "preventpinning", "excludefromshowinnewinstall"]);
        return builder;
    });
}
async function run() {
    await generateInnoFromBundle(core.getInput('bundle-dir', { 'required': true }), core.getInput('build-dir', { 'required': true }));
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
