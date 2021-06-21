import { cast, kind } from "./helpers"

export type NatKind = never[]
interface knownNumberToNat {
    0: []
    1: [never]
}
export type Nat<n extends keyof knownNumberToNat> = knownNumberToNat[n]

export type toNumberN<n extends NatKind> = cast<number, n["length"]>
export type addN<n1 extends NatKind, n2 extends NatKind> = kind<NatKind, [...n1, ...n2]>
