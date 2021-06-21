import { cast, kind } from "./helpers"

export type NatKind = never[]
export interface Nat {
    0: []
    1: [never]
}

export type toNumberN<n extends NatKind> = cast<number, n["length"]>
export type addN<n1 extends NatKind, n2 extends NatKind> = kind<NatKind, [...n1, ...n2]>
