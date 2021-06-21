/* eslint-disable @typescript-eslint/no-explicit-any */
import { Progress } from "../async"
import { Disposable, error, exhaustiveCheck, extendArray, getObject, mergeDisposable, NonEmptyObjectPath, setObject } from "../helpers"
import { kind, unreachable } from "../type-level/helpers"

// メッセージ

type CallRequest = Readonly<{
    id: number
    kind: "call"
    method: string
    args: unknown[]
    hasAbortSignal: boolean
    hasProgress: boolean
}>
type AbortRequest = Readonly<{
    id: number
    kind: "abort"
}>
type ProgressResponse = Readonly<{
    id: number
    kind: "progress"
    value: unknown
}>
type InternalRequest =
    | AbortRequest

type ClientRequest =
    | CallRequest
    | InternalRequest

type OkResponse<T = unknown> = Readonly<{
    id: number
    kind: "ok"
    value: T
}>
type ErrorResponse = Readonly<{
    id: number
    kind: "error"
    error: unknown
}>
type ReturnResponse<T> =
    | OkResponse<T>
    | ErrorResponse

type ServerResponse<T = unknown> =
    | ReturnResponse<T>
    | ProgressResponse

// メソッド

type ApiFunctionKind = (...args: any[]) => unknown
type ApiMethodObjectKind = Readonly<{
    invoke(...args: any[]): unknown
    abort?: boolean
    progress?: boolean
}>
type ApiMethodKind =
    | ApiFunctionKind
    | ApiMethodObjectKind

type ApiMethodFunction<TMethod extends ApiMethodKind> =
    TMethod extends ApiFunctionKind ? TMethod :
    TMethod extends ApiMethodObjectKind ? TMethod["invoke"] :
    unreachable

type MethodOptionsKind = Omit<ApiMethodObjectKind, "invoke">
type LastOptional<xs> =
    xs extends [any, ...infer rest]
    ? LastOptional<rest>
    : (
        xs extends [_?: infer x]
        ? x
        : never
    )

type LastOptionalParameter<f> = f extends ((...args: infer args) => any) ? LastOptional<args> : never

type IsValidFunction<TOptions extends MethodOptionsKind, TFunction extends ApiFunctionKind> =

    // abort === true のとき
    TOptions["abort"] extends true
    ? (
        // 最後の引数の signal の型が AbortSignal かチェック
        LastOptionalParameter<TFunction> extends { readonly signal?: AbortSignal }
        ? true
        : false
    )
    : (
        // progress === true のとき
        TOptions["progress"] extends true
        ? (
            // 最後の引数の progress の型が Progress かチェック
            LastOptionalParameter<TFunction> extends { readonly progress?: Progress<any> }
            ? true
            : false
        )
        : true
    )

type CheckFunctionType<TOptions extends MethodOptionsKind, TFunction extends ApiFunctionKind> =
    IsValidFunction<TOptions, TFunction> extends true ? TFunction : never

export const workerMethod = <TOptions extends MethodOptionsKind, TFunction extends ApiFunctionKind>(options: TOptions, func: CheckFunctionType<TOptions, TFunction>): kind<ApiMethodObjectKind, Readonly<TOptions & { invoke: TFunction }>> => {
    return { ...options, invoke: func }
}


// インターフェース

type ApiKind = { readonly [k in string]: ApiMethodKind }
export type MethodParameters<TApi extends ApiKind, TMethod extends keyof TApi> =
    Parameters<ApiMethodFunction<TApi[TMethod]>>

type UnwrapPromise<T> = T extends Promise<infer T> ? T : T
export type MethodRawReturnType<TApi extends ApiKind, TMethod extends keyof TApi> =
    UnwrapPromise<ReturnType<ApiMethodFunction<TApi[TMethod]>>>

type ApiProxyMethodType<T extends ApiMethodKind> =
    ApiMethodFunction<T> extends ((..._: infer args) => infer result)
    ? ((..._: args) => Promise<UnwrapPromise<result>>)
    : unreachable

const defaultAbortSignalPath = [-1, "signal"] as const
const defaultProgressPath = [-1, "progress"] as const

export interface WorkerMessagePort {
    addEventListener<K extends keyof DedicatedWorkerGlobalScopeEventMap>(type: K, listener: (this: DedicatedWorkerGlobalScope, ev: DedicatedWorkerGlobalScopeEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void

    postMessage(message: any, transfer: Transferable[]): void
    postMessage(message: any, options?: PostMessageOptions): void
}

class WorkerServer<TApi extends ApiKind> {
    private _ServerProgress = class implements Progress<unknown> {
        constructor(
            private readonly _server: WorkerServer<TApi>,
            private readonly _id: number,
        ) { }
        report(value: unknown) {
            this._server._postResponse({ id: this._id, kind: "progress", value })
        }
    }
    private readonly _logger: ((line: string) => void) | undefined

    private readonly _abortHandlers = new Map<number, AbortController>()
    constructor(
        private readonly _channel: WorkerMessagePort,
        private readonly _api: TApi,
        options?: WorkerServerClientOptions,
    ) {
        this._logger = options?.logger
    }
    private _postResponse(response: ServerResponse) {
        this._logger?.(`[server] response: ${JSON.stringify(response)}`)
        this._channel.postMessage(response)
    }
    private _postCallResult(response: ServerResponse, postReturn: Disposable | null | undefined) {
        postReturn?.dispose()
        this._postResponse(response)
    }
    private _dispatchAbortRequest({ id }: AbortRequest) {
        const controller = this._abortHandlers.get(id)
        if (controller === undefined) { return error`内部エラー：AbortController が登録されていません。id：${id}` }
        controller.abort()
    }
    private _insertAbortSignalAt(path: NonEmptyObjectPath, parameterLength: number, { id, hasAbortSignal, args }: CallRequest) {

        // AbortSignal が存在しなかった
        if (!hasAbortSignal) { return }

        // AbortController を設定
        const abortController = new AbortController()
        this._abortHandlers.set(id, abortController)

        // 引数に AbortSignal を設定
        extendArray(args, parameterLength)
        setObject(args, path, abortController.signal)

        return { dispose: () => this._abortHandlers.delete(id) }
    }
    private _progressHandlers = new Map<number, Progress<unknown>>()
    private _insertProgressAt(path: NonEmptyObjectPath, parameterLength: number, { id, hasProgress, args }: CallRequest) {
        if (!hasProgress) { return }

        const progress = new this._ServerProgress(this, id)
        this._progressHandlers.set(id, progress)
        extendArray(args, parameterLength)
        setObject(args, path, progress)
        return { dispose: () => this._progressHandlers.delete(id) }
    }
    private _setupAsyncCallStates({ abort, progress, invoke }: ApiMethodObjectKind, request: CallRequest) {
        let postReturn = undefined

        // 中断の準備
        switch (abort) {
            case true:
                postReturn = mergeDisposable(postReturn, this._insertAbortSignalAt(defaultAbortSignalPath, invoke.length, request))
                break

            case false:
            case undefined:
                break

            default:
                exhaustiveCheck(abort)
                break
        }
        // 進捗報告の準備
        switch (progress) {
            case true:
                postReturn = mergeDisposable(postReturn, this._insertProgressAt(defaultProgressPath, invoke.length, request))
                break

            case false:
            case undefined:
                break

            default:
                exhaustiveCheck(progress)
                break
        }
        return postReturn
    }
    private _dispatchCallRequest(request: CallRequest) {
        const { id, method, args } = request
        const methodObject = this._api[method]!
        let postReturn: Disposable | null | undefined

        // 呼び出し準備
        let methodFunction
        if (typeof methodObject === "function") {
            methodFunction = methodObject
        }
        else {
            postReturn = this._setupAsyncCallStates(methodObject, request)
            methodFunction = methodObject.invoke
        }

        // 呼び出し ( エラーを補足する )
        let hasError = false
        let error
        let result
        try {
            result = methodFunction(...args)
        }
        catch (e) {
            hasError = true
            error = e
        }

        // 呼び出し結果の送信
        if (hasError === true) {
            return this._postCallResult({ id, kind: "error", error }, postReturn)
        }
        if (!(result instanceof Promise)) {
            return this._postCallResult({ id, kind: "ok", value: result }, postReturn)
        }
        result.then(
            result => this._postCallResult({ id, kind: "ok", value: result }, postReturn),
            error => this._postCallResult({ id, kind: "error", error }, postReturn)
        )
    }
    listen() {
        this._channel.addEventListener("message", ({ data }) => {
            const request = data as ClientRequest
            this._logger?.(`[server] request: ${JSON.stringify(request)}`)
            switch (request.kind) {
                case "call": return this._dispatchCallRequest(request)
                case "abort": return this._dispatchAbortRequest(request)
                default: return exhaustiveCheck(request)
            }
        })
    }
}

export type ClientProxy<TApi extends ApiKind> = { [k in keyof TApi]: ApiProxyMethodType<TApi[k]> }

export class WorkerClient<TApi extends ApiKind> {
    private _nextId = 1
    private _responseHandlers = new Map<number, <T>(response: ServerResponse<T>) => void>()
    private _progressHandlers = new Map<number, Progress<unknown>>()
    readonly proxy: Readonly<ClientProxy<TApi>>
    private readonly _logger: ((line: string) => void) | undefined
    constructor(
        private readonly _channel: Worker,
        private readonly _api: TApi,
        options?: WorkerServerClientOptions,
    ) {
        this._logger = options?.logger
        const proxy = this.proxy = Object.create(null) as ClientProxy<TApi>
        for (const key in _api) {
            proxy[key] = (
                (...args: Parameters<ApiMethodFunction<TApi[Extract<keyof TApi, string>]>>) => this._callCore(key, args)
            ) as ApiProxyMethodType<TApi[Extract<keyof TApi, string>]>
        }
    }
    private _postRequest(request: ClientRequest) {
        this._logger?.(`[client] request: ${JSON.stringify(request)}`)
        this._channel.postMessage(request)
    }
    private _deleteHandlers(id: number) {
        this._responseHandlers.delete(id)
        this._progressHandlers.delete(id)
    }
    private _setupAbortSignal(abort: ApiMethodObjectKind["abort"], id: number, args: readonly unknown[]) {
        switch (abort) {
            case true: {
                const abortSignal = getObject(args, defaultAbortSignalPath)
                if (abortSignal instanceof AbortSignal) {
                    const onAbort = () => {
                        abortSignal.removeEventListener("abort", onAbort)
                        this._postRequest({ kind: "abort", id })
                    }
                    abortSignal.addEventListener("abort", onAbort)
                    return true
                }
                break
            }
            case false:
            case undefined:
                break

            default:
                exhaustiveCheck(abort)
                break
        }
        return false
    }
    private _setupProgress(progress: ApiMethodObjectKind["progress"], args: readonly unknown[], id: number) {
        switch (progress) {
            case true: {
                const progress = getObject(args, defaultProgressPath)
                if (progress instanceof Progress) {
                    this._progressHandlers.set(id, progress)
                    return true
                }
                break
            }
            case false:
            case undefined:
                break

            default:
                exhaustiveCheck(progress)
        }
        return false
    }
    private _callCore<TMethod extends keyof TApi & string>(method: TMethod, args: MethodParameters<TApi, TMethod>): Promise<MethodRawReturnType<TApi, TMethod>> {
        const schema = this._api[method]
        const id = this._nextId++

        let hasAbortSignal = false
        let hasProgress = false
        if (typeof schema === "object") {
            const { abort, progress } = schema
            hasAbortSignal = this._setupAbortSignal(abort, id, args)
            hasProgress = this._setupProgress(progress, args, id)
        }
        return new Promise((onSuccess, onError) => {
            this._responseHandlers.set(id, response => {
                switch (response.kind) {

                    // 進捗の報告
                    case "progress":
                        this._progressHandlers.get(id)?.report(response.value)
                        break

                    // メソッドの処理が終わったので以後返答が帰ってくることは無い
                    // 以後進捗報告も無視される
                    case "ok":
                        this._deleteHandlers(id)
                        onSuccess(response.value as MethodRawReturnType<TApi, TMethod>)
                        break
                    case "error":
                        this._deleteHandlers(id)
                        onError(response.error)
                        break

                    default:
                        exhaustiveCheck(response)
                        break
                }
            })
            this._postRequest({ kind: "call", id, method, args, hasAbortSignal, hasProgress })
        })
    }
    call<TMethod extends keyof TApi & string>(method: TMethod, args: MethodParameters<TApi, TMethod>) {
        return this._callCore(method, args)
    }
    private _connect() {
        this._channel.addEventListener("message", ({ data }) => {
            const response = data as ServerResponse
            this._logger?.(`[client] response: ${JSON.stringify(response)}`)
            const handler = this._responseHandlers.get(response.id)
            if (handler === undefined) { return error`内部エラー：返答ハンドラーが見つかりませんでした ${response}` }
            handler(response)
        })
    }
    static connect<TApi extends ApiKind>(channel: Worker, api: TApi, options?: WorkerServerClientOptions) {
        const client = new WorkerClient(channel, api, options)
        client._connect()
        return client
    }
}

export interface WorkerServerClientOptions {
    readonly logger?: (line: string) => void
}
export const listenWorkerServer = <TApi extends ApiKind>(channel: WorkerMessagePort, api: TApi, options?: WorkerServerClientOptions) =>
    new WorkerServer(channel, api, options).listen()

export const connectWorkerClient = <TApi extends ApiKind>(channel: Worker, schema: TApi, options?: WorkerServerClientOptions) =>
    WorkerClient.connect(channel, schema, options)
