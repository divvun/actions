import * as core from '@actions/core'
import * as exec from '@actions/exec'

import path from "path"

import { secrets, DIVVUN_PFX, Bash, RFC3161_URL } from "../shared"

const delay = (ms: number) => new Promise((resolve) => setTimeout(() => resolve(), ms))

async function run() {
    const filePath = path.resolve(core.getInput('path', { required: true }))
    const fileName = filePath.split(path.sep).pop()
    const sec = secrets()

    if (process.platform == "win32") {
        await exec.exec("signtool.exe", [
            "sign", "/t", RFC3161_URL,
            "/f", DIVVUN_PFX, "/p", sec.windows.pfxPassword,
            filePath
        ])
    } else if (process.platform === "darwin") {
        const { developerAccount, appPassword, appCodeSignId, teamId } = sec.macos

        // Codesign with hardened runtime and timestamp
        await exec.exec("codesign", ["-s", appCodeSignId, filePath, "--timestamp", "--options=runtime"])

//         // Do some notarization
//         const zipPath = path.resolve(path.dirname(filePath), "upload.zip")

//         // Create zip file the way that Apple demands
//         await exec.exec("ditto", ["-c", "-k", "--keepParent", filePath, zipPath])

//         // Upload the zip
//         const [owner, repo] = process.env.GITHUB_REPOSITORY!.split("/")
//         const fakeBundleId = `com.github.${owner}.${repo}.${fileName}.zip`
//         const response: any = JSON.parse((await Bash.runScript(`xcrun altool --notarize-app\
//  --primary-bundle-id ${fakeBundleId}\
//  --username "${developerAccount}"\
//  --password "${appPassword}"\
//  --team-id "${teamId}"\
//  --output-format json\
//  --file ${zipPath}`)).join("\n"))
//         console.log(JSON.stringify(response, null, 2))

//         const requestUuid = response["notarization-upload"].RequestUUID
        
//         // Poll API endpoint for response
//         for (;;) {
//             console.log("Waiting 10 seconds...")
//             await delay(10000)
//             console.log("Polling for status...")

//             const response: any = JSON.parse((await Bash.runScript(`xcrun altool\
//  --notarization-info ${requestUuid}\
//  -u "${developerAccount}"\
//  -p "${appPassword}"\
//  --output-format json`)).join("\n"))
//             console.log(JSON.stringify(response, null, 2))
            
//             const status = response["notarization-info"].Status

//             if (status === "success") {
//                 console.log("Success!")
//                 break
//             } else if (status === "in progress") {
//                 console.log("In progress...")
//             } else {
//                 throw new Error(`Got failure status: ${status}`)
//             }
//         }
    } else {
        throw new Error("Unsupported platform: " + process.platform)
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
