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
function getSudo() {
    const x = core.getInput("sudo");
    if (x === "true") {
        return true;
    }
    if (x === "false") {
        return false;
    }
    throw new Error("invalid value: " + x);
}
async function run() {
    const requiresSudo = getSudo();
    const requiresApertium = !!core.getInput("apertium");
    core.debug("Requires sudo? " + requiresSudo);
    const basePackages = [
        "wget",
        "build-essential",
        "autotools-dev",
        "autoconf",
        "git",
        "pkg-config",
        "gawk",
        "python3-pip",
        "zip",
        "bc"
    ];
    const devPackages = ["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck"];
    if (requiresApertium) {
        devPackages.push("apertium");
        devPackages.push("apertium-dev");
    }
    await shared_1.Apt.update(requiresSudo);
    await shared_1.Apt.install(basePackages, requiresSudo);
    await shared_1.Pip.install(["PyYAML"], requiresSudo);
    await shared_1.ProjectJJ.addNightlyToApt(requiresSudo);
    await shared_1.Apt.install(devPackages, requiresSudo);
    await shared_1.Ssh.cleanKnownHosts();
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
