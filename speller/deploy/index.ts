import * as core from '@actions/core'
import toml from 'toml'
import fs from 'fs'
import path from 'path'

import { shouldDeploy, MacOSPackageTarget, nonUndefinedProxy, validateProductCode, ReleaseRequest } from '../../shared'
import { PahkatUploader, WindowsExecutableKind, RebootSpec } from "../../shared"
import { SpellerManifest, SpellerType, derivePackageId } from '../manifest'


function loadManifest(manifestPath: string): SpellerManifest {
    const manifestString = fs.readFileSync(manifestPath, "utf8")
    return nonUndefinedProxy(toml.parse(manifestString), true)
}

function releaseReq(version: string, platform: string, dependencies: any, channel: string | null): ReleaseRequest {
    const req: ReleaseRequest = {
        version,
        platform,
    }

    if (Object.keys(dependencies).length) {
        req.dependencies = dependencies
    }

    if (channel) {
        req.channel = channel
    }

    return req
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
        
        const repoPackageUrl = `${pahkatRepo}packages/${packageId}`

        let payloadMetadata: string | null = null
        let platform: string | null = null
        let artifactPath: string | null = null
        let artifactUrl: string | null = null

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

            const ext = path.extname(payloadPath)
            const pathItems = [packageId, version, platform]
            artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
            artifactUrl = path.join(PahkatUploader.ARTIFACTS_URL, path.basename(artifactPath))

            payloadMetadata = await PahkatUploader.release.windowsExecutable(
                releaseReq(version, platform, { "windivvun": "*" }, channel),
                artifactUrl,
                1,
                1, 
                WindowsExecutableKind.Nsis,
                productCode,
                [RebootSpec.Install, RebootSpec.Uninstall])
        } else if (spellerType === SpellerType.MacOS) {
            platform = "macos"
            const pkgId = manifest.macos.system_pkg_id

            const ext = path.extname(payloadPath)
            const pathItems = [packageId, version, platform]
            artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
            artifactUrl = path.join(PahkatUploader.ARTIFACTS_URL, path.basename(artifactPath))

            payloadMetadata = await PahkatUploader.release.macosPackage(
                releaseReq(version, platform, { "macdivvun": "*" }, channel),
                artifactUrl,
                1,
                1,
                pkgId,
                [RebootSpec.Install, RebootSpec.Uninstall],
                [MacOSPackageTarget.System, MacOSPackageTarget.User])
        } else if (spellerType === SpellerType.Mobile) {
            platform = "mobile"

            const ext = path.extname(payloadPath)
            const pathItems = [packageId, version, platform]
            artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
            artifactUrl = path.join(PahkatUploader.ARTIFACTS_URL, path.basename(artifactPath))
            
            payloadMetadata = await PahkatUploader.release.tarballPackage(
                releaseReq(version, platform, {}, channel),
                artifactUrl,
                1,
                1)
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

        if (artifactPath == null) {
            throw new Error("artifact path is null; this is a logic error.")
        }
    
        if (artifactUrl == null) {
            throw new Error("artifact url is null; this is a logic error.")
        }
    
        const isDeploying = shouldDeploy() || core.getInput('force-deploy');
    
        if (!isDeploying) {
            core.warning("Not deploying; ending.")
            return
        }
    
        await PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl)
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
