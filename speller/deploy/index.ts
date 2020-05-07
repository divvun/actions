import * as core from '@actions/core'
import * as exec from '@actions/exec'
import toml from 'toml'
import fs from 'fs'
import path from 'path'

import { divvunConfigDir, getDivvunEnv } from '../../shared'
import { BundleType, Manifest } from '../manifest'

async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml.parse(fs.readFileSync(manifestPath).toString()) as Manifest

        const bundleType = core.getInput('bundleType') as BundleType;
        const payload = core.getInput('payload');

        const bundle = manifest.bundles[bundleType]
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`)

        const testDeploy = !!core.getInput('testDeploy')
        const deployScript = path.join(divvunConfigDir(), "repo", "scripts", "pahkat_deploy_new.sh")
        const exit = await exec.exec("bash", [deployScript], {
            env: {
                ...process.env,
                "DEPLOY_SVN_USER": await getDivvunEnv("DEPLOY_SVN_USER"),
                "DEPLOY_SVN_PASSWORD": await getDivvunEnv("DEPLOY_SVN_PASSWORD"),
                "DEPLOY_SVN_REPO": bundle.repo,
                "DEPLOY_SVN_PKG_ID": bundle.package,
                "DEPLOY_SVN_PKG_PLATFORM": bundle.platform,
                "DEPLOY_SVN_PKG_PAYLOAD": payload,
                "DEPLOY_SVN_PKG_VERSION": manifest.package.version,
                "DEPLOY_SVN_COMMIT": !testDeploy ? "1" : ""
            }
        });

        if (exit != 0) {
            throw new Error("deploy failed")
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run()