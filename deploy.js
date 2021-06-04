//@ts-check
const { spawnSync } = require("child_process")
const run = (/** @type {string} */ arg0, /** @type {string[]} */ ...args) => {
    console.log(`> ${arg0}${args.map(x => ` ${x}`).join("")}`)
    const result = spawnSync(arg0, args, { shell: true, stdio: "inherit", encoding: "utf-8" })
    if (result.error || result.status !== 0) { throw result.error ?? result }
    return result.output
}
run("npm", "install")
run("npm", "run", "build")

run("git", "add", ".")
run("git", "-c", `user.name=action@github.com`, "-c", `user.email="GitHub Action"`, "commit", "--all", "-m", `"${__filename} による自動コミット"`)
run("git", "push")
