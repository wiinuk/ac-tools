
export abstract class Progress<T> {
    abstract report(value: T): void
}
export class AbortError extends Error {
    readonly code = DOMException.ABORT_ERR
    override name = "AbortError"
    constructor(message = "aborted") { super(message) }
}
