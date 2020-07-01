import * as core from '@actions/core'
import * as exec from '@actions/exec'
import tmp from 'tmp'
import path from 'path'
import { secrets, DIVVUN_PFX } from '../shared'

const ISCC_PATH = "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"

async function run() {
    const issPath = core.getInput('path', { required: true })
    const rawDefines = core.getInput('defines')
    const sec = secrets()
    
    const signCmd =  `/S"signtool=signtool.exe sign ` + 
        `/t http://timestamp.verisign.com/scripts/timstamp.dll ` +
        `/f ${DIVVUN_PFX} ` +
        `/p ${sec.windows.pfxPassword} $f"`

    let defines: string[] = []
    if (rawDefines != null) {
        defines = rawDefines.split(" ")
            .map(x => `/D${x.trim()}`)
    }

    const installerOutput = tmp.dirSync({ keep: true }).name

    await exec.exec(ISCC_PATH, [
        "/Qp", `/O${installerOutput}`, signCmd, ...defines, issPath
    ])

    core.setOutput("installer-path", path.join(installerOutput, "install.exe"))
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
