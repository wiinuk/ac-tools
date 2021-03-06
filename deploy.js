/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
const { run, invoke, handleMainProcess } = require("./shell")
const path = require("path")

handleMainProcess(async () => {
    await run`npm install`
    await run`npm run build`

    await run`git add .`
    const files = (await invoke`git status --short`).split("\n").filter(x => x.length !== 0)
    if (files.length === 0) {
        console.log("変更が無かったので自動コミットは実行されません")
        return
    }

    await run`git -c user.name=action@github.com -c user.email="GitHub Action" commit --all --message "${path.relative(process.cwd(), __filename)} による自動コミット"`
    await run`git push`
})
