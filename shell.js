/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
const { spawn } = require("child_process")
const { exit } = require("process")

class ExitError extends Error {
    exitCode
    signal
    output
    /**
     * @param {number} exitCode
     * @param {string} signal
     * @param {string} output
     */
    constructor(exitCode, signal, output) {
        super("A non-zero exit code was returned.")
        this.exitCode = exitCode
        this.signal = signal
        this.output = output
    }
}

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
            onError(new ExitError(
                exitCode,
                signal,
                output.join("")
            ))
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
const run = (command, ...args) => runCore(String.raw(command, ...args), { inheritStdio: true })
exports.run = run

/**
 * @param {TemplateStringsArray} command
 * @param  {...unknown} args
 * @returns {Promise<string>}
 */
const invoke = async (command, ...args) => (await runCore(String.raw(command, ...args), { inheritStdio: false })).output
exports.invoke = invoke

/**
 * @param {() => Promise<void>} asyncProcess
 */
const handleMainProcess = asyncProcess => {
    asyncProcess().catch(error => {
        console.error(error)
        exit(error instanceof ExitError ? error.exitCode : -1)
    })
}
exports.handleMainProcess = handleMainProcess
