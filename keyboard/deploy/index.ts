import * as core from '@actions/core'
import * as github from '@actions/github'
import toml from 'toml'
import fs from 'fs'

import { shouldDeploy, MacOSPackageTarget, Kbdgen, validateProductCode } from '../../shared'

import { PahkatUploader, WindowsExecutableKind, RebootSpec } from "../../shared"
import { KeyboardType, getBundle } from '../types'


export function derivePackageId() {
    const repo = github.context.repo.repo
    if (!repo.startsWith("keyboard-")) {
        throw new Error("Repository is not prefixed with 'keyboard")
    }

    const lang = github.context.repo.repo.split("keyboard-")[1]
    return `keyboard-${lang}`
}

async function run() {
    const payloadPath = core.getInput('payload-path', { required: true })
    const keyboardType = core.getInput('keyboard-type', { required: true }) as KeyboardType
    const bundlePath = getBundle()
    const channel = core.getInput('channel') || null;
    const pahkatRepo = core.getInput('repo', { required: true });
    const packageId = derivePackageId()
    
    const url = `${pahkatRepo}packages/${packageId}`

    let payloadMetadata: string | null = null
    let platform: string | null = null
    let version: string | null = null

    if (keyboardType === KeyboardType.MacOS) {
        const target = Kbdgen.loadTarget(bundlePath, "mac")
        const pkgId = target.packageId
        version = target.version
        platform = "macos"

        payloadMetadata = await PahkatUploader.payload.macosPackage(
            1,
            1,
            pkgId,
            [RebootSpec.Install, RebootSpec.Uninstall],
            [MacOSPackageTarget.System, MacOSPackageTarget.User],
            payloadPath)

    } else if (keyboardType === KeyboardType.Windows) {
        const target = Kbdgen.loadTarget(bundlePath, "win")
        const productCode = validateProductCode(WindowsExecutableKind.Inno, target.uuid)
        version = target.version
        platform = "windows"

        payloadMetadata = await PahkatUploader.payload.windowsExecutable(
            1,
            1, 
            WindowsExecutableKind.Inno,
            productCode,
            [RebootSpec.Install, RebootSpec.Uninstall],
            payloadPath)
    } else {
        throw new Error("Unhandled keyboard type: " + keyboardType)
    }

    if (payloadMetadata == null) {
        throw new Error("Payload is null; this is a logic error.")
    }

    if (version == null) {
        throw new Error("Platform is null; this is a logic error.")
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

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
