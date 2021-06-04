//@ts-check
const { spawn, exec, execFileSync, execSync } = require("child_process")
const path = require("path")

/**
 * @param {string} command
 * @returns {Promise<{ signal: string, output: string }>}
 */
 const runCore = (command, { inheritStdio }) => new Promise((onSuccess, onError) => {
    console.log(`> ${command}`)
    const child = spawn(command, [], { shell: true, stdio: inheritStdio ? "inherit" : undefined })
    /** @type {string[]} */
    const output = []
    child.stdout?.on("data", chunk => output.push(chunk.toString()))
    child.stderr?.on("data", chunk => output.push(chunk.toString()))
    child.on("error", onError)
    child.on("exit", (exitCode, signal) => {
        if (exitCode !== 0) {
            onError(new (class ExitError extends Error {
                constructor() { super("A non-zero exit code was returned.") }
                exitCode = exitCode
                signal = signal
            }))
        }
        else {
            onSuccess({
                signal,
                output: output.join(""),
            })
        }
    })
})
/**
 * @param {TemplateStringsArray} command
 * @param  {...unknown} args
 * @returns {Promise<{ signal: string }>}
 */
const run = (command, ...args) => runCore(String.raw(command, args), { inheritStdio: true })
/**
 * @param {TemplateStringsArray} command
 * @param  {...unknown} args
 * @returns {Promise<string>}
 */
const invoke = async (command, ...args) => (await runCore(String.raw(command, args), { inheritStdio: false })).output

const main = async () => {
    await run`npm install`
    await run`npm run build`

    await run`git add .`
    const files = (await invoke`git status --short`).trim().split("\n")
    if (files.length === 0) { return }

    await run`git -c user.name=action@github.com -c user.email="GitHub Action" commit --all --message "${path.relative(process.cwd(), __filename)} による自動コミット"`
    await run`git push`
}

main().catch(error => console.error(error))
