import * as core from '@actions/core'
import toml from 'toml'
import fs from 'fs'
import { Manifest, BundleType } from '../manifest'

async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml.parse(fs.readFileSync(manifestPath).toString()) as Manifest
        const bundleType = core.getInput('bundleType') as BundleType;

        const bundle = manifest.bundles[bundleType]
        if (!bundle) {
            core.warning(`No bundle config specified for ${bundleType}`)
            // core.setOutput("bundleExists", false)
            return
        }

        core.setOutput("bundleExists", "true")
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run()