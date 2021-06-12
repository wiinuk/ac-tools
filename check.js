/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
const { run, handleMainProcess } = require("./shell")

handleMainProcess(async () => {
    await run`npm install`
    await run`npm test`
})
