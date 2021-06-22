import * as core from "@actions/core"
import { Kbdgen } from "../../shared"
import { KeyboardType } from "../types"

async function run() {
    const keyboardType = core.getInput("keyboard-type", { required: true }) as KeyboardType
    const bundlePath = core.getInput("bundle-path", { required: true })

    if (keyboardType !== KeyboardType.iOS && keyboardType !== KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for meta build: ${keyboardType}`)
    }

    await Kbdgen.fetchMetaBundle(bundlePath)
    let payloadPath

    let buildStart = 0
    const githubRepo = process.env.GITHUB_REPOSITORY!

    if (githubRepo === "divvun/divvun-keyboard") {
        if (keyboardType === KeyboardType.Android) {
            buildStart = 1590918851
        }
    } else if (githubRepo === "divvun/divvun-dev-keyboard") {
        // Do nothing
    } else {
        throw new Error(`Unsupported repository for release builds: ${githubRepo}`)
    }

    if (keyboardType === KeyboardType.Android) {
        Kbdgen.setBuildNumber(bundlePath, "android", buildStart)
        payloadPath = await Kbdgen.buildAndroid(bundlePath, githubRepo)
    } else if (keyboardType === KeyboardType.iOS) {
        Kbdgen.setBuildNumber(bundlePath, "ios", buildStart)
        payloadPath = await Kbdgen.build_iOS(bundlePath)
    }

    // In general, this will be unused, because iOS and Android builds are
    // submitted directly to their respective app stores.
    // core.setOutput("payload-path", payloadPath)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
