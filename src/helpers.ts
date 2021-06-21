/* eslint-disable @typescript-eslint/no-explicit-any */
import { cast, kind } from "./type-level/helpers"
import { NatKind, toNumberN, addN, Nat } from "./type-level/nat"

export const log = (template: TemplateStringsArray, ...values: unknown[]) => {
    let result = template[0]
    for (let i = 1; i < template.length; i++) {
        const vi = i - 1
        result += vi < values.length ? JSON.stringify(values[vi]) : ""
        result += template[i]!
    }
    console.log(result)
}
export function error(message: TemplateStringsArray, ...args: unknown[]): never
export function error(message: string): never
export function error(message: string | TemplateStringsArray, ...args: unknown[]) {
    throw new Error(typeof message === "string" ? message : String.raw(message, ...args))
}
export const exhaustiveCheck = (_: never) => error`exhaustiveCheck`

export const extendArray = <T>(array: (T | undefined)[], minLength: number) => {
    if (array.length < minLength) { array[minLength] = undefined }
}

type itemAtNegativeIndexWorker<items extends readonly any[], negativeIndex extends number, skipCount extends NatKind> =
    items extends readonly [...infer heads, infer last]
    ? (
        `-${toNumberN<addN<skipCount, Nat[1]>>}` extends `${negativeIndex}`
        ? last
        : itemAtNegativeIndexWorker<heads, negativeIndex, addN<skipCount, Nat[1]>>
    )
    : undefined

type getItem<items extends readonly any[], indexOrNegativeInteger extends number> =
    sign<indexOrNegativeInteger> extends -1
    ? itemAtNegativeIndexWorker<items, indexOrNegativeInteger, Nat[0]>
    : items[indexOrNegativeInteger]

export type ObjectKey = number | string
export type ObjectPath = readonly ObjectKey[]
export type NonEmptyObjectPath = readonly [ObjectKey, ...ObjectPath]
export type PropertyRootKind = Readonly<Record<never, unknown>>

type getProperty<x, key extends ObjectKey> =

    // 負のインデックスパターン
    [key, x, sign<cast<number, key>>] extends [kind<number, infer key>, kind<readonly any[], infer T>, -1]
    ? getItem<T, key>

    // 通常のキー
    : x extends { [k in key]: infer value }
    ? value

    : unknown

export type GetObject<T, TPath extends ObjectPath> =

    // パスの先頭のキーを取り出す
    TPath extends readonly [kind<ObjectKey, infer key>, ...kind<ObjectPath, infer path>]
    ? GetObject<getProperty<T, key>, path>

    // 空のパス
    : TPath extends readonly [] ? T

    // `ObjectPath[]` など
    : unknown


export const getObject = <T, TPath extends ObjectPath>(root: T, path: TPath): GetObject<T, TPath> => {
    let current: unknown = root
    for (let i = 0; i < path.length; i++) {
        const key = path[i]!

        // 負のインデックスパターン
        if (typeof key === "number" && key < 0 && Array.isArray(current)) {
            current = current[current.length + key]
            continue
        }

        // インデックス取得すると TypeError が投げられる
        if (current === undefined || current === null) {
            current = undefined
            continue
        }

        // インデックス取得
        current = (current as Record<string | number, unknown>)[key]
    }
    return current as GetObject<T, TPath>
}

export type SetObjectRoot<TPath extends NonEmptyObjectPath, TValue> =
    TPath extends readonly [kind<ObjectKey, infer key>]
    ? { [k in key]: TValue }
    :
    TPath extends readonly [kind<ObjectKey, infer key>, ...kind<NonEmptyObjectPath, infer path>]
    ? { readonly [k in key]: SetObjectRoot<path, TValue> }
    :
    // ObjectPath[] など
    PropertyRootKind

export const setObject: <TPath extends NonEmptyObjectPath, TValue>(root: PropertyRootKind, path: TPath, value: TValue) => asserts root is SetObjectRoot<TPath, TValue> = (root, path, value) => {
    let parent = root as Record<ObjectKey, unknown>
    let key = path[0]

    for (let i = 1; i < path.length; i++) {
        const value = parent[key]
        key = path[i]!

        if (typeof key === "number" && key < 0) {
            if (Array.isArray(value)) {
                key = value.length + key
                parent = value as Record<number, unknown>
            }
            else {
                parent = parent[key] = [] as Record<number, unknown>
            }
        }
        else {
            if (value === null || value === undefined) {
                if (typeof key === "number") {
                    parent = parent[key] = [] as Record<number, unknown>
                }
                else {
                    parent = parent[key] = Object.create(null)
                }
            }
        }
    }
    parent[key] = value
}

export interface Disposable {
    dispose(): void
}
export const mergeDisposable = (disposable1: Disposable | undefined | null, disposable2: Disposable | undefined | null) => {
    if (disposable1 == null) { return disposable2 }
    if (disposable2 == null) { return disposable1 }
    return { dispose() { disposable1.dispose(); disposable2.dispose() } }
}
