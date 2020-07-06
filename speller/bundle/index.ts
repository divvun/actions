import * as core from '@actions/core'
import * as io from "@actions/io"
import path from 'path'
import toml from 'toml'
import fs from 'fs'

import { ThfstTools, Tar, SpellerPaths, DivvunBundler, nonUndefinedProxy } from '../../shared'
import { SpellerType, SpellerManifest, derivePackageId, deriveLangTag } from '../manifest'
import { makeInstaller } from '../../inno-setup/lib'
import { InnoSetupBuilder } from '../../inno'

async function run() {
    const version = core.getInput("version", { required: true })
    const spellerType = core.getInput("speller-type", { required: true }) as SpellerType
    const manifest = nonUndefinedProxy(toml.parse(fs.readFileSync(
        core.getInput("speller-manifest-path", { required: true }), "utf8"
    )), true) as SpellerManifest
    const spellerPaths = nonUndefinedProxy(JSON.parse(
        core.getInput("speller-paths", { required: true })
    ), true) as SpellerPaths

    let { name } = manifest
    const packageId = derivePackageId(spellerType)
    const langTag = deriveLangTag(false)

    if (spellerType == SpellerType.Mobile) {
        const bhfstPaths = []

        for (const [langTag, zhfstPath] of Object.entries(spellerPaths.mobile)) {
            const bhfstPath = await ThfstTools.zhfstToBhfst(zhfstPath)
            const langTagBhfst = `${path.dirname(bhfstPath)}/${langTag}.bhfst`

            core.debug(`Copying ${bhfstPath} to ${langTagBhfst}`)
            await io.cp(bhfstPath, langTagBhfst)
            bhfstPaths.push(langTagBhfst)
        }

        const payloadPath = path.resolve(`./${packageId}_${version}_mobile.txz`)
        core.debug(`Creating txz from [${bhfstPaths.join(", ")}] at ${payloadPath}`)
        await Tar.createFlatTxz(bhfstPaths, payloadPath)

        core.setOutput("payload-path", payloadPath)
    } else if (spellerType == SpellerType.Windows) {
        if (manifest.windows.system_product_code == null) {
            throw new Error("Missing system_product_code")
        }

        const builder = new InnoSetupBuilder()

        builder.name(name)
            .version(version)
            .publisher("Universitetet i Tromsø - Norges arktiske universitet")
            .url("http://divvun.no/")
            .productCode(manifest.windows.system_product_code)
            .defaultDirName(`{commonpf}\\WinDivvun\\Spellers\\${langTag}`)
            .files(files => {
                const flags = ["ignoreversion", "recursesubdirs", "uninsrestartdelete"]

                for (const zhfstPath of Object.values(spellerPaths.desktop)) {
                    files.add(zhfstPath, "{app}", flags)
                }

                return files
            })
            .code(code => {
                if (manifest.windows.legacy_product_codes) {
                    for (const productCode of manifest.windows.legacy_product_codes) {
                        code.uninstallLegacy(productCode, "nsis")
                    }
                }

                code.execPostInstall(
                    "{commonpf}\\WinDivvun\\i686\\spelli.exe",
                    `register -t ${langTag} -p "{commonpf}\\WinDivvun\\Spellers\\${langTag}\\${langTag}.zhfst"`,
                    `Could not register speller for tag: ${langTag}`)

                code.execPreUninstall(
                    "{commonpf}\\WinDivvun\\i686\\spelli.exe",
                    `register -t ${langTag}`,
                    `Could not register speller for tag: ${langTag}`)

                if (manifest.windows.extra_locales) {
                    for (const [tag, zhfstPrefix] of Object.entries(manifest.windows.extra_locales)) {
                        code.execPostInstall(
                            "{commonpf}\\WinDivvun\\i686\\spelli.exe",
                            `register -t ${tag} -p "{commonpf}\\WinDivvun\\Spellers\\${langTag}\\${zhfstPrefix}.zhfst"`,
                            `Could not register speller for tag: ${tag}`)

                        code.execPreUninstall(
                            "{commonpf}\\WinDivvun\\i686\\spelli.exe",
                            `deregister -t ${tag}`,
                            `Could not deregister speller for tag: ${tag}`)
                    }
                }

                return code
            })
            .write("./install.iss")

        core.debug("generated install.iss:")
        core.debug(builder.build())

        const payloadPath = await makeInstaller("./install.iss")
        core.setOutput("payload-path", payloadPath)
    } else if (spellerType == SpellerType.MacOS) {
        const payloadPath = await DivvunBundler.bundleMacOS(name, version, packageId, langTag, spellerPaths)
        core.setOutput("payload-path", payloadPath)
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
