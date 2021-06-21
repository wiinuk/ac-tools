import { describe, test, expect } from "@jest/globals"
import { AbortError, Progress } from "../src/async"
import { ClientProxy, connectWorkerClient, listenWorkerServer } from "../src/worker/interface"
import { createDummyWorkerAndPort } from "./dummy-sync-worker"
import * as q from "qcheck"
import { FlowerAllele, FlowerKind, flowerKinds, geneFromAlleles, geneToAlleles, showAllele, showGene, _00, _01, _11 } from "../src/flower"
import { Random } from "qcheck"


interface CountDownOptions {
    signal?: AbortSignal
    progress?: Progress<string>
}
const countDown = (intervalMs: number, count: number, options?: CountDownOptions) => new Promise((onSuccess, onError) => {
    if (!(0 <= count)) { return onError(new Error("0 <= count")) }

    let id = setInterval(() => { /* ダミー */ }, 0)
    options?.signal?.addEventListener("abort", () => {
        if (id !== undefined) { clearTimeout(id) }
        options.progress?.report(`キャンセルされました`)
        onError(new AbortError())
    })

    const f = () => {
        if (0 < count) {
            options?.progress?.report(`残り ${count} 回`)
            count--
            id = setInterval(f, intervalMs)
        }
        else {
            options?.progress?.report(`完了!`)
            onSuccess(undefined)
        }
    }
    f()
})
describe("abort と progress 規約", () => {
    test("countDown", async () => {
        const log: string[] = []
        const controller = new AbortController()
        let error
        try {
            await countDown(1000, 10, {
                signal: controller.signal,
                progress: {
                    report(message) {
                        log.push(message)
                        if (message === "残り 8 回") {
                            controller.abort()
                        }
                    }
                }
            })
        }
        catch (e) {
            error = e
        }
        expect(log).toStrictEqual([
            "残り 10 回",
            "残り 9 回",
            "残り 8 回",
            "キャンセルされました",

        ])
        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe("AbortError")
    })
})
namespace api {
    const sleep = (ms: number) => new Promise(onSuccess =>
        setTimeout(onSuccess, ms)
    )
    export function div(x: number, y: number) {
        if (y === 0) { throw new Error("ゼロ割") }
        return x / y
    }
    export async function divAsync(x: number, y: number) {
        await sleep(200)
        if (y === 0) { throw new Error("ゼロ割") }
        return x / y
    }
    export async function countDownAsync(intervalMs: number, count: number, options?: CountDownOptions) {
        await countDown(intervalMs, count, options)
    }
}
describe("ワーカー間通信", () => {
    const createProxy = async (logScope: (proxy: ClientProxy<typeof api>) => Promise<void>) => {
        const lines: string[] = []
        const logger = (line: string) => lines.push(line)

        const [worker, messagePort] = createDummyWorkerAndPort()
        listenWorkerServer(messagePort, api, { logger })
        await logScope(connectWorkerClient(worker, api, { logger }).proxy)
        return lines
    }
    test("div", async () => {
        const log = await createProxy(async proxy => {
            expect(await proxy.div(20, 10)).toBe(2)
            await expect(proxy.div(10, 0)).rejects.toThrow("ゼロ割")
        })
        expect(log).toStrictEqual([
            `[client] request: {"kind":"call","id":1,"method":"div","args":[20,10],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] request: {"kind":"call","id":1,"method":"div","args":[20,10],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] response: {"id":1,"kind":"ok","value":2}`,
            `[client] response: {"id":1,"kind":"ok","value":2}`,
            `[client] request: {"kind":"call","id":2,"method":"div","args":[10,0],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] request: {"kind":"call","id":2,"method":"div","args":[10,0],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] response: {"id":2,"kind":"error","error":{}}`,
            `[client] response: {"id":2,"kind":"error","error":{}}`,
        ])
    })
    test("divAsync", async () => {
        const log = await createProxy(async proxy => {
            expect(await proxy.divAsync(20, 10)).toBe(2)
            await expect(proxy.divAsync(10, 0)).rejects.toThrow("ゼロ割")
        })
        expect(log).toStrictEqual([
            `[client] request: {"kind":"call","id":1,"method":"divAsync","args":[20,10],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] request: {"kind":"call","id":1,"method":"divAsync","args":[20,10],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] response: {"id":1,"kind":"ok","value":2}`,
            `[client] response: {"id":1,"kind":"ok","value":2}`,
            `[client] request: {"kind":"call","id":2,"method":"divAsync","args":[10,0],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] request: {"kind":"call","id":2,"method":"divAsync","args":[10,0],"hasAbortSignal":false,"hasProgress":false}`,
            `[server] response: {"id":2,"kind":"error","error":{}}`,
            `[client] response: {"id":2,"kind":"error","error":{}}`,
        ])
    })
    test("countDownAsync ( 成功終了 )", async () => {
        const log = await createProxy(async proxy => {
            await proxy.countDownAsync(1000, 2)
        })
        expect(log).toStrictEqual([
            "[client] request: {\"kind\":\"call\",\"id\":1,\"method\":\"countDownAsync\",\"args\":[1000,2],\"hasAbortSignal\":false,\"hasProgress\":false}",
            "[server] request: {\"kind\":\"call\",\"id\":1,\"method\":\"countDownAsync\",\"args\":[1000,2],\"hasAbortSignal\":false,\"hasProgress\":false}",
            "[server] response: {\"id\":1,\"kind\":\"ok\"}",
            "[client] response: {\"id\":1,\"kind\":\"ok\"}",
        ])
    })
    test("countDownAsync ( 例外終了 )", async () => {
        const log = await createProxy(async proxy => {
            await expect(proxy.countDownAsync(1000, -1)).rejects.toThrow("0 <= count")
        })
        expect(log).toStrictEqual([
            "[client] request: {\"kind\":\"call\",\"id\":1,\"method\":\"countDownAsync\",\"args\":[1000,-1],\"hasAbortSignal\":false,\"hasProgress\":false}",
            "[server] request: {\"kind\":\"call\",\"id\":1,\"method\":\"countDownAsync\",\"args\":[1000,-1],\"hasAbortSignal\":false,\"hasProgress\":false}",
            "[server] response: {\"id\":1,\"kind\":\"error\",\"error\":{}}",
            "[client] response: {\"id\":1,\"kind\":\"error\",\"error\":{}}",
        ])
    })
})
