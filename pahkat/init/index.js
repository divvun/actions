"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const shared_1 = require("../../shared");
async function run() {
    const repoUrl = core.getInput('repo', { required: true });
    const channel = core.getInput('channel');
    const packages = core.getInput('packages', { required: true }).split(",").map(x => x.trim());
    await shared_1.PahkatPrefix.bootstrap();
    await shared_1.PahkatPrefix.addRepo(repoUrl, channel);
    await shared_1.PahkatPrefix.install(packages);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
