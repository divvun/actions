"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("../../shared");
async function run() {
    await shared_1.Apt.update();
    await shared_1.Apt.install([
        "wget",
        "build-essential",
        "autotools-dev",
        "autoconf",
        "git",
        "pkg-config",
        "gawk",
        "python3-pip",
        "zip"
    ]);
    await shared_1.Pip.install(["PyYAML"]);
    await shared_1.ProjectJJ.addNightlyToApt();
    await shared_1.Apt.install(["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck"]);
    await shared_1.Ssh.cleanKnownHosts();
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
