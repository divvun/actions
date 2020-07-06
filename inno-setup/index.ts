import * as core from '@actions/core'
import path from 'path'
import { makeInstaller } from './lib'

async function run() {
    const issPath = core.getInput('path', { required: true })
    const rawDefines = core.getInput('defines')
    
    let defines: string[] = []
    if (rawDefines != null) {
        defines = rawDefines.split(" ")
            .map(x => `/D${x.trim()}`)
    }
    
    const installerOutput = await makeInstaller(issPath, defines)

    core.setOutput("installer-path", path.join(installerOutput, "install.exe"))
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
