import * as core from '@actions/core'
import { PahkatPrefix } from "../../shared"

async function run() {
    const repos = core.getInput('repo', { required: true }).split(",").map(x => x.trim())
    const channel = core.getInput('channel')
    const packages = core.getInput('packages', { required: true }).split(",").map(x => x.trim())
    
    await PahkatPrefix.bootstrap()

    for (let repoUrl of repos) {
        await PahkatPrefix.addRepo(repoUrl, channel)
    }
    
    await PahkatPrefix.install(packages)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
  })
  
