import * as core from '@actions/core'
import * as exec from '@actions/exec'
import path from 'path'

import { divvunConfigDir, getDivvunEnv, shouldDeploy } from '../shared'

async function run() {
    try {
        const testDeploy = !!core.getInput('testDeploy') || !shouldDeploy()
        const isDeploying = !testDeploy ||  core.getInput('forceDeploy');
        const deployScript = path.join(divvunConfigDir(), "repo", "scripts", "pahkat_deploy_new.sh")
        const exit = await exec.exec("bash", [deployScript], {
            env: {
                ...process.env,
                "DEPLOY_SVN_USER": await getDivvunEnv("DEPLOY_SVN_USER"),
                "DEPLOY_SVN_PASSWORD": await getDivvunEnv("DEPLOY_SVN_PASSWORD"),
                "DEPLOY_SVN_REPO": core.getInput('repository'),
                "DEPLOY_SVN_PKG_ID": core.getInput('package'),
                "DEPLOY_SVN_PKG_PLATFORM": core.getInput('platform'),
                "DEPLOY_SVN_PKG_PAYLOAD": path.resolve(core.getInput('payload')),
                "DEPLOY_SVN_PKG_PAYLOAD_METADATA": path.resolve(core.getInput('payloadMetadata')),
                "DEPLOY_SVN_PKG_VERSION": core.getInput('version'),
                // TODO: Meh
                "DEPLOY_SVN_REPO_ARTIFACTS": "https://pahkat.uit.no/artifacts/",
                "DEPLOY_SVN_COMMIT": isDeploying ? "1" : ""
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