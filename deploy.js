//@ts-check
const { execSync } = require("child_process")
const run = (/** @type {TemplateStringsArray} */ template, /** @type {unknown[]} */ ...substitutions) => {
    const command = String.raw(template, substitutions)
    console.log(`> ${command}`)
    return execSync(command, { stdio: "inherit", encoding: "utf-8" })
}
run`npm install`
run`npm run build`

const remoteName = "origin"
const remoteBranchName = "gh-pages"
const temporaryBranchName = `__temp-${remoteBranchName}`
const message = `${__filename} による自動コミット`

const currentBranchName = run`git symbolic-ref --short HEAD`
run`git checkout -b ${temporaryBranchName} ${remoteName}/${remoteBranchName}`
run`git add .`
run`git commit --all --message="${message}"`
run`git pull`
run`git push ${remoteName} ${remoteBranchName}`
run`git checkout ${currentBranchName}`
run`git --delete ${temporaryBranchName}`
