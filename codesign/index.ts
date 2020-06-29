import * as core from '@actions/core'
import * as exec from '@actions/exec'

import { secrets, DIVVUN_PFX } from "../shared"

async function run() {
    const filePath = core.getInput('path', { required: true })
    const sec = secrets()

    if (process.platform == "win32") {
        await exec.exec("signtool.exe", [
            "sign", "/t", "http://timestamp.verisign.com/scripts/timstamp.dll",
            "/f", DIVVUN_PFX, "/p", sec.windows.pfxPassword,
            filePath
        ])
    } else {
        throw new Error("Unsupported platform: " + process.platform)
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
