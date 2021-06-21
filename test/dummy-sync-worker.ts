/* eslint-disable @typescript-eslint/no-explicit-any */
import { error } from "../src/helpers"
import { serialize, deserialize } from "v8"
import { WorkerMessagePort } from "../src/worker/interface"

const notImplemented = () => error`Method not implemented.`
const deepClone = <T>(v: T): T => deserialize(serialize(v))

type DedicatedWorkerEventListener<K extends keyof DedicatedWorkerGlobalScopeEventMap> =
    (this: DedicatedWorkerGlobalScope, ev: DedicatedWorkerGlobalScopeEventMap[K]) => any

class MessageChannel {
    private readonly _messageQueue: MessageEvent[] = []
    private readonly _listeners = new Set<(ev: MessageEvent) => void>()

    add(listener: (ev: MessageEvent) => void) {
        let message
        while ((message = this._messageQueue.shift()) !== undefined) {
            listener(message)
        }
        this._listeners.add(listener)
    }
    delete(listener: (ev: MessageEvent) => void) {
        this._listeners.delete(listener)
    }
    post(message: MessageEvent) {
        if (this._listeners.size === 0) {
            this._messageQueue.push(message)
            return
        }
        for (const listener of this._listeners) {
            listener(message)
        }
    }
}

class DummyWorkerMessagePort implements WorkerMessagePort {
    constructor(
        private readonly _ownerMessageListeners: MessageChannel,
        private readonly _workerMessageListeners: MessageChannel,
    ) { }

    addEventListener<K extends keyof DedicatedWorkerGlobalScopeEventMap>(type: K, listener: DedicatedWorkerEventListener<K>, options?: boolean | AddEventListenerOptions): void
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
        if (options || typeof listener !== "function") { return notImplemented() }
        switch (type) {
            case "message": this._ownerMessageListeners.add(listener); return
            default: return notImplemented()
        }
    }
    postMessage(message: any, transfer: Transferable[]): void
    postMessage(message: any, options?: PostMessageOptions): void
    postMessage(message: any, options?: PostMessageOptions | Transferable[]): void {
        if (options) { return notImplemented() }

        this._workerMessageListeners.post(new MessageEvent("worker", { data: deepClone(message) }))
    }
}
class DummyWorker implements Worker {
    private readonly _ownerMessageListeners = new MessageChannel()
    private readonly _workerMessageListeners = new MessageChannel()
    private readonly _messagePort = new DummyWorkerMessagePort(
        this._ownerMessageListeners,
        this._workerMessageListeners,
    )
    get onmessage(): ((this: Worker, ev: MessageEvent<any>) => any) | null { return notImplemented() }
    set onmessage(_) { notImplemented() }
    get onmessageerror(): ((this: Worker, ev: MessageEvent<any>) => any) | null { return notImplemented() }
    set onmessageerror(_) { notImplemented() }
    get onerror(): ((this: AbstractWorker, ev: ErrorEvent) => any) | null { return notImplemented() }
    set onerror(_) { notImplemented() }

    postMessage(message: any, transfer: Transferable[]): void
    postMessage(message: any, options?: PostMessageOptions): void
    postMessage(message: any, options?: PostMessageOptions | Transferable[]): void {
        if (options) { return notImplemented() }

        this._ownerMessageListeners.post(new MessageEvent("worker", { data: deepClone(message) }))
    }
    terminate() { notImplemented() }

    addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
    addEventListener(type: string, listener: ((this: Worker, ev: WorkerEventMap[keyof WorkerEventMap]) => any) | EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (options || typeof listener === "object") { return notImplemented() }

        switch (type) {
            case "message":
                this._workerMessageListeners.add(listener)
                return

            case "error":
            case "messageerror":
            default:
                return notImplemented()
        }
    }
    removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | ((this: Worker, ev: WorkerEventMap[keyof WorkerEventMap]) => any), options?: boolean | EventListenerOptions): void {
        if (options || typeof listener === "object") { return notImplemented() }

        switch (type) {
            case "message":
                this._ownerMessageListeners.delete(listener)
                return

            case "error":
            case "messageerror":
            default:
                return notImplemented()
        }
    }
    dispatchEvent(_: Event) { return notImplemented() }

    static createDummyWorkerAndPort(): [Worker, WorkerMessagePort] {
        const worker = new DummyWorker()
        return [worker, worker._messagePort]
    }
}

export const createDummyWorkerAndPort = DummyWorker.createDummyWorkerAndPort
