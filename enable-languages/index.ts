import * as core from '@actions/core'
import { Powershell } from '../shared'

async function run() {
    const tags = core.getInput('tags', { required: true }).split(",").map(x => x.trim())

    let script = `$langs = Get-WinUserLanguageList; `
    for (const tag of tags) {
        script += `$langs.add('${tag}'); `
    }
    
    script += `Set-WinUserLanguageList -LanguageList $langs;`
    await Powershell.runScript(script)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
