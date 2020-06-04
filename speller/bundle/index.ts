import * as core from '@actions/core'
import * as io from "@actions/io"
import path from 'path'
import toml from 'toml'
import fs from 'fs'

import { ThfstTools, Tar, SpellerPaths, DivvunBundler, versionAsNightly, nonUndefinedProxy } from '../../shared'
import { SpellerType, SpellerManifest, derivePackageId, deriveLangTag } from '../manifest'

async function run() {
    const spellerType = core.getInput("speller-type", { required: true }) as SpellerType
    const manifest = nonUndefinedProxy(toml.parse(fs.readFileSync(
        core.getInput("speller-manifest-path", { required: true }), "utf8"
    )), true) as SpellerManifest
    const spellerPaths = nonUndefinedProxy(JSON.parse(
        core.getInput("speller-paths", { required: true })
    ), true) as SpellerPaths

    let { name, version } = manifest
    const packageId = derivePackageId(spellerType)
    const langTag = deriveLangTag(false)

    // TODO: allow non-nightly builds
    version = await versionAsNightly(version)
    core.setOutput("version", version)

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

        const payloadPath = await DivvunBundler.bundleWindows(name, version, manifest.windows.system_product_code,
            packageId, langTag, spellerPaths)

        core.setOutput("payload-path", payloadPath)
    } else if (spellerType == SpellerType.WindowsMSOffice) {
        if (manifest.windows.msoffice_product_code == null) {
            throw new Error("Missing msoffice_product_code")
        }
        
        const payloadPath = await DivvunBundler.bundleWindowsMSOffice(name, version, manifest.windows.msoffice_product_code,
            packageId, langTag, spellerPaths)


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
