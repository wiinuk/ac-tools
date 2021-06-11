
import spec from "./flower-spec"
import { fill as fillOptions, FilledOptions, optionSpec, OptionsSpecToOptions } from "./options"

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
export type FlowerKind = "バラ" | "コスモス" | "チューリップ" | "パンジー" | "ユリ" | "アネモネ" | "ヒヤシンス" | "キク"
type FlowerColor = FlowerSpec[0]
type _FlowerTag = FlowerSpec[1]
type Gene = readonly [Allele, Allele, Allele, Allele]
export type FlowerGene = Gene
type Allele11 = 0 | 1 | 3
type UndefinedAllele = 2
type Allele = Allele11 | UndefinedAllele
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
export const findBreedParents = (kind: FlowerKind, childGene: Gene, options: FilledFindBreedTreeOptions): readonly (readonly [Gene, Gene])[] => {
    const childColor = flowerColor(kind, childGene)
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

                    if (options.distinguishedOnlyByColor && hasDuplicatedChildColor(kind, parent1Gene, parent2Gene, childColor)) { continue }
                    result.push([parent1Gene, parent2Gene])
                }
            }
        }
    }
    return result
}

const findBreedTreeOptionsSpec = {
    /** 交配するとき、子が色で見分けられないなら除外する */
    distinguishedOnlyByColor: optionSpec("boolean", true)
}
type FindBreedTreeOptions = OptionsSpecToOptions<typeof findBreedTreeOptionsSpec>
type FilledFindBreedTreeOptions = FilledOptions<typeof findBreedTreeOptionsSpec>

type BreedBranch = readonly [
    kind: "Breed",
    parent1: BreedTree,
    parent2: BreedTree,
    child: Gene,
]
type BreedRoot = readonly [
    kind: "Root",
    child: Gene,
]
type BreedTree =
    | BreedRoot
    | BreedBranch

const getBreedCost = (parent1: Gene, parent2: Gene, child: Gene) => {
    let childGeneCount = 0
    let allGeneCount = 0
    getChildGenes(parent1, parent2).forEach(([gene, count]) => {
        allGeneCount += count
        if (geneEquals(gene, child)) {
            childGeneCount += count
        }
    })
    if (allGeneCount === 0) { throw new Error("0") }

    // 指定された子が生まれる確率が高いほどコストは下がる
    return (1 - (childGeneCount / allGeneCount)) +

        // 交配そのもののコスト
        0.1
}
/**
 * 目標となる花の遺伝子を生成する最小コストの交配木を返す
 * @param kind 花の種類
 * @param rootGenes 原種の遺伝子
 * @param childGene 目標となる花の遺伝子
 * @param options
 */
export const findBreedTree = (kind: FlowerKind, rootGenes: readonly Gene[], childGene: Gene, options?: FindBreedTreeOptions) => {
    const filledOptions = fillOptions(findBreedTreeOptionsSpec, options)

    const rootSet: ReadonlySet<GeneKey> = new Set(rootGenes.map(geneKey))
    const visitedGeneSet = new Set<GeneKey>()
    type BreedTreeWithCost = [cost: number, tree: BreedTree]
    const memo = new Map<GeneKey, BreedTreeWithCost | null>()

    const worker = (child: Gene): BreedTreeWithCost | null => {
        const childKey = geneKey(child)

        // 始祖の中に子が含まれるなら返す
        if (rootSet.has(childKey)) {
            const tree: BreedTreeWithCost = [0, ["Root", child]]
            memo.set(childKey, tree)
            return tree
        }
        // メモ
        const result = memo.get(childKey)
        if (result !== undefined) { return result }

        // 循環参照
        if (visitedGeneSet.has(childKey)) { return null }
        visitedGeneSet.add(childKey)

        // 子が生まれる親の組み合わせを列挙
        const pairs = findBreedParents(kind, child, filledOptions)
        let minCostTree: BreedTreeWithCost | null = null
        for (const [parent1, parent2] of pairs) {

            // 親が生まれる交配木を取得
            const tree1 = worker(parent1)
            if (tree1 == null) { continue }
            const tree2 = worker(parent2)
            if (tree2 == null) { continue }

            // 交配のコストを計算
            const breedCost = getBreedCost(parent1, parent2, child)
            const cost = tree1[0] + tree2[0] + breedCost

            // 最もコストの低い交配木を選ぶ
            if (minCostTree && minCostTree[0] < cost) { continue }
            minCostTree = [
                cost,
                ["Breed", tree1[1], tree2[1], child]
            ]
        }

        if (minCostTree == null) {
            memo.set(childKey, null)
            return null
        }

        visitedGeneSet.delete(childKey)

        memo.set(childKey, minCostTree)
        return minCostTree
    }
    return worker(childGene)?.[1]
}
