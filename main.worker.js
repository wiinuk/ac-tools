/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
const { parentPort } = require('worker_threads')

setTimeout(() => {
    parentPort.addListener("message", e =>
        console.log("[", new Date(), "][worker] {", e.data, "}")
    )
}, 10000)

setTimeout(() => {
    parentPort.addListener("message", e =>
        console.log("[", new Date(), "][worker2] {", e.data, "}")
    )
}, 5000)
