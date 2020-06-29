import * as core from '@actions/core'
import * as glob from "@actions/glob"
import path from "path"
import tmp from "tmp"

import { Tar } from "../shared"

async function run() {
    const filesPath = core.getInput('path', { required: true })
    
    const globber = await glob.create(path.join(filesPath, "*"), {
        followSymbolicLinks: false
    })
    const files = await globber.glob()

    await Tar.bootstrap()
    const outputTxz = tmp.fileSync({
        postfix: ".txz",
        keep: true,
        tries: 3,
    }).name

    await Tar.createFlatTxz(files, outputTxz)
    core.setOutput("txz-path", outputTxz)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
