// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");

// Require Third-Party dependencies
const git = require("isomorphic-git");

// Constant
const CWD = process.cwd();
git.plugins.set("fs", fs);

async function cloneRepo(repoName, token) {
    const reject = [];
    const dir = join(CWD, "..", `${repoName}_TEST`);
    const url = `https://github.com/SlimIO/${repoName}`;
    const optsClone = Object.assign({
        dir, url,
        singleBranch: true,
        oauth2format: "github"
    }, token);

    await git.clone(optsClone);
    await git.pull(optsClone);
}

module.exports = { cloneRepo };
