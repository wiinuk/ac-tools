
import spec from "./flower-spec"
import { fill as fillOptions, FilledOptions, optionSpec, OptionsSpecToOptions } from "./options"
import * as AStar from "./a-star"

type flowerSpecOfRawSpecs<rawSpecs> =
    rawSpecs extends readonly (infer rawSpec)[]
    ? rawSpec
    : never

type rawSpec = typeof spec
type FlowerSpec =
    { [k in keyof rawSpec]: flowerSpecOfRawSpecs<rawSpec[k]> }[FlowerKind] extends readonly [infer color, infer tag, readonly [infer a1, infer a2, infer a3, infer a4]]
    ? (
        a1 | a2 | a3 | a4 extends infer a
        ? readonly [color, tag, readonly [a, a, a, a]]
        : never
    )
    : never

type FlowerSpecs = { readonly [k in FlowerKind]: readonly FlowerSpec[] }
export type FlowerKind = keyof rawSpec
type FlowerColor = FlowerSpec[0]
type _FlowerTag = FlowerSpec[1]
type Gene = FlowerSpec[2]
export type FlowerGene = Gene
type Allele = Gene extends readonly (infer a)[] ? a : never
const specs: FlowerSpecs = spec

export const _u = 0b10
export const _00 = 0b00
export const _01 = 0b01
export const _11 = 0b11
const allelePairs00 = [
    [_00, _00],
    [_00, _01],
    [_01, _00],
    [_01, _01],
] as const
const allelePairs01 = [
    [_00, _01],
    [_00, _11],
    [_01, _00],
    [_01, _01],
    [_01, _11],
    [_11, _00],
    [_11, _01],
] as const
const allelePairs11 = [
    [_01, _01],
    [_11, _01],
    [_01, _11],
    [_11, _11],
] as const

const undefinedAllelePairs = [[_u, _u]] as const
const allelePairs = (a: Allele): readonly (readonly [Allele, Allele])[] => {
    switch (a) {
        case _00: return allelePairs00
        case _01: return allelePairs01
        case _11: return allelePairs11
        case _u: return undefinedAllelePairs
    }
}

const error = (message: string) => { throw new Error(message) }
const geneEquals = (g1: Gene, g2: Gene) => {
    if (g1.length !== g2.length) { return false }
    for (let index = 0; index < g1.length; index++) {
        if (g1[index] !== g2[index]) { return false }
    }
    return true
}

/** @internal */
export const flowerColor = (kind: FlowerKind, gene: Gene) => {
    const [color] = specs[kind]
        .find(([, , g]) => geneEquals(g, gene))
        ?? error(`内部エラー: 花の仕様が見つかりませんでした。kind: ${kind}, gene: ${JSON.stringify(gene)}`)

    return color
}
type GeneKey = number

const undefinedAlleles = [_u] as const
/** @internal */
export const childAlleles = (a1: Allele, a2: Allele): readonly Allele[] => {
    if (a1 === _u || a2 === _u) { return undefinedAlleles }

    const x11 = (a1 & 0b10) >> 1
    const x12 = (a1 & 0b01) >> 0
    const x21 = (a2 & 0b10) >> 1
    const x22 = (a2 & 0b01) >> 0
    const breed = (x1: number, x2: number) => {
        const x = (x1 << 1) | x2
        return (x === 0b10 ? 0b01 : x) as unknown as Allele
    }
    return [
        breed(x11, x21),
        breed(x11, x22),
        breed(x12, x21),
        breed(x12, x22),
    ]
}
const geneKey = ([a1, a2, a3, a4]: Gene) => (a1 << 6) | (a2 << 4) | (a3 << 2) | (a4 << 0)

/**
 * 指定された遺伝子を持つ親を交配したとき生まれる子の、重複のない一覧を返す
 * @internal
 */
export const getChildGenes = (parent1Gene: Gene, parent2Gene: Gene): readonly (readonly [childGene: Gene, count: number])[] => {
    const [p11, p12, p13, p14] = parent1Gene
    const [p21, p22, p23, p24] = parent2Gene
    const as1 = childAlleles(p11, p21)
    const as2 = childAlleles(p12, p22)
    const as3 = childAlleles(p13, p23)
    const as4 = childAlleles(p14, p24)
    const genes = new Map<GeneKey, { gene: Gene, count: number }>()
    for (let i1 = 0; i1 < as1.length; i1++) {
        const a1 = as1[i1] ?? _u
        for (let i2 = 0; i2 < as2.length; i2++) {
            const a2 = as2[i2] ?? _u
            for (let i3 = 0; i3 < as3.length; i3++) {
                const a3 = as3[i3] ?? _u
                for (let i4 = 0; i4 < as4.length; i4++) {
                    const a4 = as4[i4] ?? _u

                    const gene = [a1, a2, a3, a4] as const
                    const key = geneKey(gene)
                    let entry = genes.get(key)
                    if (entry === undefined) {
                        entry = { gene, count: 0 }
                        genes.set(key, entry)
                    }
                    entry.count++
                }
            }
        }
    }

    const result: [Gene, number][] = []
    genes.forEach(entry => result.push([entry.gene, entry.count]))
    return result
}

/**
 * 指定された遺伝子を持つ親を交配したとき、🧬は違うが色（指定された色）が同じ子が生まれるかどうかを表す真偽値を返す
 */
const hasDuplicatedChildColor = (kind: FlowerKind, parent1Gene: Gene, parent2Gene: Gene, color: FlowerColor) => {
    const childGenes = getChildGenes(parent1Gene, parent2Gene)
    let findGene = false
    for (let i = 0; i < childGenes.length; i++) {
        const [childGene] = childGenes[i]!
        if (flowerColor(kind, childGene) === color) {
            if (findGene) { return true }
            findGene = true
        }
    }
    return false
}
/**
 * 指定された子🧬を生成する親🧬の交配ペアを列挙する
 * @internal
 */
export const findBreedParents = (kind: FlowerKind, childGene: Gene, options: FilledFindPathToRootsOptions): readonly (readonly [Gene, Gene])[] => {
    const result: (readonly [Gene, Gene])[] = []
    const [allele1, allele2, allele3, allele4] = childGene
    const allele1Pairs = allelePairs(allele1)
    const allele2Pairs = allelePairs(allele2)
    const allele3Pairs = allelePairs(allele3)
    const allele4Pairs = allelePairs(allele4)
    for (let i1 = 0; i1 < allele1Pairs.length; i1++) {
        const p1 = allele1Pairs[i1]!
        for (let i2 = 0; i2 < allele2Pairs.length; i2++) {
            const p2 = allele2Pairs[i2]!
            for (let i3 = 0; i3 < allele3Pairs.length; i3++) {
                const p3 = allele3Pairs[i3]!
                for (let i4 = 0; i4 < allele4Pairs.length; i4++) {
                    const p4 = allele4Pairs[i4]!

                    const parent1Gene = [p1[0], p2[0], p3[0], p4[0]] as const
                    const parent2Gene = [p1[1], p2[1], p3[1], p4[1]] as const

                    if (options.distinguishedOnlyByColor && hasDuplicatedChildColor(kind, parent1Gene, parent2Gene, flowerColor(kind, childGene))) { continue }
                    result.push([parent1Gene, parent2Gene])
                }
            }
        }
    }
    return result
}

const optionsSpec = {
    /** 交配するとき、子が色で見分けられないなら除外する */
    distinguishedOnlyByColor: optionSpec("boolean", true)
}
type FindPathToRootsOptions = OptionsSpecToOptions<typeof optionsSpec>
type FilledFindPathToRootsOptions = FilledOptions<typeof optionsSpec>


const pathFinder = new AStar.Solver()
/**
 * スタートとゴールとなる花から可能な交配パスを返す
 * @param kind 花の種類
 * @param rootGenes スタートになる花の遺伝子 ( 始祖 )
 * @param childGene ゴールになる子の花の遺伝子
 * @param options
 */
export const findPathsToRoots = (kind: FlowerKind, rootGenes: readonly Gene[], childGene: Gene, options?: FindPathToRootsOptions) => {
    const _filledOptions = fillOptions(optionsSpec, options)


    for (; ;) {
        childGene
    }
}
