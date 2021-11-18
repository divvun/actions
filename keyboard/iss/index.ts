import path from "path"
import fs from "fs"
import { InnoSetupBuilder } from '../../inno'
import { Kbdgen } from '../../shared'
import { v5 as uuidv5 } from 'uuid'
import * as core from "@actions/core"


const KBDGEN_NAMESPACE = uuidv5("divvun.no", uuidv5.DNS)

function layoutTarget(layout: {[key: string]: any}) {
    const targets = layout["targets"] || {}
    return targets["win"] || {}
}

function getKbdId(locale: string, layout: {[key: string]: any}) {
    if ("id" in layout) {
        return "kbd" + layout["id"]
    }
    return "kbd" + locale.replace(/[^A-Za-z0-9-]/g, "").substr(0, 5)
}

async function generateInnoFromBundle(bundlePath: string, buildDir: string) {
    var bundle = Kbdgen.loadTarget(bundlePath, "win")
    var project = Kbdgen.loadProjectBundle(bundlePath)
    var layouts = await Kbdgen.loadLayouts(bundlePath)

    var builder = new InnoSetupBuilder()

    builder.name(bundle.appName)
        .publisher(project.organisation)
        .version(bundle.version)
        .url(bundle.url)
        .productCode(bundle.uuid)
        .defaultDirName("{pf}\\" + bundle.appName)
        .files((builder) => {
            builder.add(`${buildDir}\\kbdi.exe`, "{app}", ["restartreplace", "uninsrestartdelete", "ignoreversion"])
            builder.add(`${buildDir}\\i386\\*`, "{sys}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "not Is64BitInstallMode")
            builder.add(`${buildDir}\\amd64\\*`, "{sys}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode")
            builder.add(`${buildDir}\\wow64\\*`, "{wow64}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode")

            return builder
        })

    for (const [locale, layout] of Object.entries(layouts)) {
        if ("win" in layout.modes || "desktop" in layout.modes) {
            addLayoutToInstaller(builder, locale, layout)
        }
    }
    const fileName = path.join(buildDir, `install.all.iss`)
    fs.writeFileSync(fileName, builder.build())
}

function addLayoutToInstaller(builder: InnoSetupBuilder, locale: string, layout: {[key: string]: any}) {
        const target = layoutTarget(layout)
        const kbdId = getKbdId(locale, target)
        const dllName = kbdId + ".dll"
        const languageCode = target["locale"] || locale
        const languageName = target["languageName"]
        const layoutDisplayName = layout["displayNames"][locale]
        const guidStr = uuidv5(kbdId, KBDGEN_NAMESPACE)
        if (!layoutDisplayName) {
            throw new Error(`Display name for ${locale} not found`)
        }

        builder.run((builder) => {
            builder.withFilename("{app}\\kbdi.exe")
                   .withParameter("keyboard_install")
                   .withParameter(`-t ""${languageCode}""`)
            if(languageName) {
                builder.withParameter(`-l ""${languageName}""`)
            }
            builder.withParameter(`-g ""{${guidStr}""`)
                   .withParameter(`-d ${dllName}`)
                   .withParameter(`-n ${layoutDisplayName}`)
                   .withParameter("-e")
                   .withFlags(["runhidden", "waituntilterminated"])
            return builder
        })
        .uninstallRun((builder) => {
            builder.withFilename("{app}\\kbdi.exe")
               .withParameter("keyboard_uninstall")
               .withParameter(`""${guidStr}""`)
               .withFlags(["runhidden", "waituntilterminated"])

            return builder
        })
        .icons((builder) => {
            builder.withName(`{group}\\{cm:Enable,${layoutDisplayName}}`)
                .withFilename("{app}\\kbdi.exe")
                .withParameter("keyboard_enable")
                .withParameter(`-g ""{${guidStr}""`)
                .withParameter(`-t ${languageCode}`)
                .withFlags(["runminimized", "preventpinning", "excludefromshowinnewinstall"])

            return builder
        })

}

async function run() {
    await generateInnoFromBundle(core.getInput('bundle-dir', {'required': true}), core.getInput('build-dir', {'required': true}))
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
