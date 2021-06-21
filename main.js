//@ts-check
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Worker } = require("worker_threads")
const worker = new Worker("./main.worker.js")

worker.addListener("message", e => {
    console.log("[", new Date(), "][client] {", e.data, "}")
})

new Promise(() => {
    setInterval(() => {
        console.log("[", new Date(), "][owner]")
        worker.postMessage(Math.random())
    }, 1000)
})
