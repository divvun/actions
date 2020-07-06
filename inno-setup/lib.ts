import * as exec from "@actions/exec"
import tmp from "tmp"

import { DIVVUN_PFX, secrets } from "../shared"

const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`

export async function makeInstaller(issPath: string, defines: string[] = []): Promise<string> {
    const sec = secrets()

    const signCmd = `/S"signtool=signtool.exe sign ` + 
        `/t http://timestamp.verisign.com/scripts/timstamp.dll ` +
        `/f ${DIVVUN_PFX} ` +
        `/p ${sec.windows.pfxPassword} $f"`

    const installerOutput = tmp.dirSync({ keep: true }).name

    await exec.exec(`${ISCC_PATH} ${signCmd}`, [
        "/Qp", `/O${installerOutput}`, ...defines, issPath
    ])

    return installerOutput
}
