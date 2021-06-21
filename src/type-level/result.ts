/* eslint-disable @typescript-eslint/no-explicit-any */

export const failureTag = Symbol("Failure")
export interface Failure<TMessage extends string, TData> {
    tag: typeof failureTag
    message: TMessage
    data: TData
}
export const successTag = Symbol("Success")
export interface Success<T> {
    tag: typeof successTag
    value: T
}
export type ResultKind =
    | Success<any>
    | Failure<any, any>
