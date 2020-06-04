import * as core from "@actions/core"
import { Kbdgen } from "../../shared"
import { KeyboardType, getBundle } from "../types"


async function run() {
    const keyboardType = core.getInput("keyboard-type", { required: true }) as KeyboardType
    const bundlePath = getBundle()

    if (keyboardType === KeyboardType.iOS || keyboardType === KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for non-meta build: ${keyboardType}`)
    }
    
    let payloadPath

    if (keyboardType === KeyboardType.MacOS) {
        await Kbdgen.setNightlyVersion(bundlePath, "mac")
        payloadPath = await Kbdgen.buildMacOS(bundlePath)
    } else if (keyboardType === KeyboardType.Windows) {
        await Kbdgen.setNightlyVersion(bundlePath, "win")
        payloadPath = await Kbdgen.buildWindows(bundlePath)
    } else {
        throw new Error(`Unhandled keyboard type: ${keyboardType}`)
    }

    core.setOutput("payload-path", payloadPath)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
