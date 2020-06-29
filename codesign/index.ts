import * as core from '@actions/core'
import * as exec from '@actions/exec'

import { secrets, divvunConfigDir } from "../shared"

async function run() {
    const filePath = core.getInput('path', { required: true })
    const sec = secrets()

    if (process.platform == "win32") {
        const pw = sec.windows.pfxPassword
        const pfx = `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`

        await exec.exec("signtool.exe", [
            "sign", "/t", "http://timestamp.verisign.com/scripts/timstamp.dll",
            "/f", pfx, "/p", pw,
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
