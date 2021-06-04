//@ts-check
const { spawn } = require("child_process")

/**
 * @param {string} command
 * @param {{ inheritStdio: boolean }} _arg1
 * @returns {Promise<{ signal: string, output: string }>}
 */
const runCore = (command, { inheritStdio }) => new Promise((onSuccess, onError) => {
    console.log(`> ${command}`)
    const child = spawn(command, [], { shell: true, stdio: inheritStdio ? "inherit" : undefined })
    /** @type {string[]} */
    const output = []

    /**
     * @template T, TargetType
     * @typedef { { [k in keyof T]: T[k] extends TargetType ? k : never }[keyof T] } FilterKeys
     */
    /**
     * @typedef {
        & FilterKeys<typeof process, import("stream").Writable>
        & FilterKeys<typeof child, import("stream").Readable | undefined>
    } WriterKey
     */
    const addOnDataListener = (/** @type {WriterKey} */ ioKey) => child[ioKey]?.on("data", chunk => {
        const data = chunk.toString()
        process[ioKey].write(data)
        output.push(data)
    })

    addOnDataListener("stdout")
    addOnDataListener("stderr")
    child.on("error", onError)
    child.on("exit", (exitCode, signal) => {
        if (exitCode !== 0) {
            onError(new (class ExitError extends Error {
                constructor() { super("A non-zero exit code was returned.") }
                exitCode = exitCode
                signal = signal
                output = output.join("")
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
exports.run = run

/**
 * @param {TemplateStringsArray} command
 * @param  {...unknown} args
 * @returns {Promise<string>}
 */
const invoke = async (command, ...args) => (await runCore(String.raw(command, args), { inheritStdio: false })).output
exports.invoke = invoke
