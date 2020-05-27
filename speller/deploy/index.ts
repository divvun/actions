import * as core from '@actions/core'
import toml from 'toml'
import fs from 'fs'

import { shouldDeploy, MacOSPackageTarget, nonUndefinedProxy, validateProductCode } from '../../shared'

import { PahkatUploader, WindowsExecutableKind, RebootSpec } from "../../shared"
import { SpellerManifest, SpellerType, derivePackageId } from '../manifest'


function loadManifest(manifestPath: string): SpellerManifest {
    const manifestString = fs.readFileSync(manifestPath, "utf8")
    return nonUndefinedProxy(toml.parse(manifestString), true)
}

async function run() {
    try {
        const spellerType = core.getInput('speller-type', { required: true }) as SpellerType
        const manifest = loadManifest(core.getInput('speller-manifest-path', { required: true }))
        const payloadPath = core.getInput('payload-path', { required: true })
        const version = core.getInput('version', { required: true });
        const channel = core.getInput('channel') || null;
        
        const pahkatRepo = core.getInput('repo', { required: true });
        const packageId = derivePackageId(spellerType)
        
        const url = `${pahkatRepo}packages/${packageId}`

        let payloadMetadata: string | null = null
        let platform: string | null = null

        // Generate the payload metadata
        if (spellerType === SpellerType.Windows || spellerType === SpellerType.WindowsMSOffice) {
            platform = "windows"

            let productCode
            
            if (spellerType === SpellerType.Windows) {
                productCode = manifest.windows.system_product_code
            } else {
                productCode = manifest.windows.msoffice_product_code
            }
            productCode = validateProductCode(WindowsExecutableKind.Nsis, productCode)

            payloadMetadata = await PahkatUploader.payload.windowsExecutable(
                1,
                1, 
                WindowsExecutableKind.Nsis,
                productCode,
                [RebootSpec.Install, RebootSpec.Uninstall],
                payloadPath)
        } else if (spellerType === SpellerType.MacOS) {
            platform = "macos"
            const pkgId = manifest.macos.system_pkg_id

            payloadMetadata = await PahkatUploader.payload.macosPackage(
                1,
                1,
                pkgId,
                [RebootSpec.Install, RebootSpec.Uninstall],
                [MacOSPackageTarget.System, MacOSPackageTarget.User],
                payloadPath)
        } else if (spellerType === SpellerType.Mobile) {
            platform = "mobile"

            payloadMetadata = await PahkatUploader.payload.tarballPackage(
                1,
                1,
                payloadPath)
        } else {
            throw new Error(`Unsupported bundle type ${spellerType}`)
        }

        if (payloadMetadata == null) {
            throw new Error("Payload is null; this is a logic error.")
        }

        if (platform == null) {
            throw new Error("Platform is null; this is a logic error.")
        }

        fs.writeFileSync("./payload.toml", payloadMetadata, "utf8")

        const isDeploying = shouldDeploy() || core.getInput('force-deploy');

        if (!isDeploying) {
            core.warning("Not deploying; ending.")
            return
        }

        await PahkatUploader.upload(payloadPath, "./payload.toml", {
            url,
            version,
            platform,
            channel,
        })
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
