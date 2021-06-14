
import getSpec from "./flower-spec"
import { fill as fillOptions, FilledOptions, optionSpec, OptionsSpecToOptions } from "./options"

const error = (message: string) => { throw new Error(message) }
type flowerSpecOfRawSpecs<rawSpecs> =
    rawSpecs extends readonly (infer rawSpec)[]
    ? rawSpec
    : never

type rawSpec = ReturnType<typeof getSpec>
type FlowerSpec =
    { [k in keyof rawSpec]: flowerSpecOfRawSpecs<rawSpec[k]> }[FlowerKind] extends readonly [infer color, infer tag, unknown]
    ? readonly [color, tag, Gene]
    : never

type FlowerSpecs = { readonly [k in FlowerKind]: ReadonlyMap<Gene, FlowerSpec> }
export type FlowerKind = "バラ" | "コスモス" | "チューリップ" | "パンジー" | "ユリ" | "アネモネ" | "ヒヤシンス" | "キク"
export type FlowerColor = FlowerSpec[0]
type _FlowerTag = FlowerSpec[1]

const genePrivateSymbol = Symbol("_geneBrand")

/** `typeof Gene === "number"` */
class Gene {
    private readonly _geneBrand: typeof genePrivateSymbol = genePrivateSymbol
    private constructor() { /* インスタンスを作らせないため */ }
}
export const geneFromAlleles = (a1: Allele, a2: Allele, a3: Allele, a4: Allele) =>
    ((a1 << 6) | (a2 << 4) | (a3 << 2) | (a4 << 0)) as unknown as Gene

export const getAllele = (g: Gene, n: 1 | 2 | 3 | 4) =>
    ((g as unknown as number >> ((4 - n) * 2)) & 0b11) as Allele

export const geneToAlleles = (g: Gene) => [getAllele(g, 1), getAllele(g, 2), getAllele(g, 3), getAllele(g, 4)] as const

export type FlowerGene = Gene
type Allele11 = 0 | 1 | 3
type UndefinedAllele = 2
type Allele = Allele11 | UndefinedAllele
export type FlowerAllele = Allele

const specs = ((): FlowerSpecs => {
    const result: { [k in FlowerKind]: ReadonlyMap<Gene, FlowerSpec> } = Object.create(null)
    const spec = getSpec()
    for (const kind in spec) {
        const key = kind as keyof (typeof spec)
        const geneToSpec = new Map<Gene, FlowerSpec>()
        const specs = spec[key]
        for (const spec of specs) {
            const [color, tag, [a1, a2, a3, a4]] = spec
            const gene = geneFromAlleles(a1, a2, a3, a4)
            geneToSpec.set(gene, [color, tag, gene])
        }
        result[key] = geneToSpec
    }
    return result
})()
export const flowerKinds = Object.freeze(Object.keys(specs) as FlowerKind[])

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

const makeAllGenes = (count: 3 | 4): readonly FlowerGene[] => {
    const alleles = [_00, _01, _11] as const
    const alleles4 = count === 4 ? alleles : [_u] as const
    const genes: FlowerGene[] = []
    for (let i1 = 0; i1 < alleles.length; i1++) {
        const p1 = alleles[i1]!
        for (let i2 = 0; i2 < alleles.length; i2++) {
            const p2 = alleles[i2]!
            for (let i3 = 0; i3 < alleles.length; i3++) {
                const p3 = alleles[i3]!
                for (let i4 = 0; i4 < alleles4.length; i4++) {
                    const p4 = alleles4[i4]!
                    genes.push(geneFromAlleles(p1, p2, p3, p4))
                }
            }
        }
    }
    return genes
}
const genes3 = makeAllGenes(3)
const genes4 = makeAllGenes(4)
const allGenes = (kind: FlowerKind) => kind === "バラ" ? genes4 : genes3

export const showAllele = (allele: FlowerAllele) => {
    switch (allele) {
        case _00: return "00"
        case _01: return "01"
        case _11: return "11"
        case _u: return null
    }
}
export const showGene = (gene: FlowerGene) => {
    const alleles = geneToAlleles(gene).map(showAllele)
    while (0 !== alleles.length && alleles[alleles.length - 1] === null) {
        alleles.pop()
    }
    return alleles.map(a => a === null ? "??" : a).join("-")
}

const geneSpec = (kind: FlowerKind, gene: Gene) =>
    specs[kind].get(gene)
    ?? error(`内部エラー: 花の仕様が見つかりませんでした。kind: ${kind}, gene: ${JSON.stringify(showGene(gene))}`)

/** @internal */
export const flowerColor = (kind: FlowerKind, gene: Gene) => geneSpec(kind, gene)[0]

/** @internal */
export const flowerIsSeed = (kind: FlowerKind, gene: Gene) => geneSpec(kind, gene)[1] === "種"
export const forEachFlowerGenes = (kind: FlowerKind, action: (gene: Gene) => void): void =>
    specs[kind].forEach(x => action(x[2]))

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

const enum Flow {
    Break,
    Continue,
}
type ForEachFlow =
    | Flow.Break
    | Flow.Continue
    | void

export function forEachChildGenes(parent1: Gene, parent2: Gene, action: (childGene: Gene) => ForEachFlow): void
export function forEachChildGenes<State>(parent1: Gene, parent2: Gene, action: (childGene: Gene, state: State) => ForEachFlow, state: State): void
export function forEachChildGenes(parent1: Gene, parent2: Gene, action: (childGene: Gene, state: unknown) => ForEachFlow, state?: unknown) {
    const p11 = getAllele(parent1, 1)
    const p12 = getAllele(parent1, 2)
    const p13 = getAllele(parent1, 3)
    const p14 = getAllele(parent1, 4)
    const p21 = getAllele(parent2, 1)
    const p22 = getAllele(parent2, 2)
    const p23 = getAllele(parent2, 3)
    const p24 = getAllele(parent2, 4)
    const as1 = childAlleles(p11, p21)
    const as2 = childAlleles(p12, p22)
    const as3 = childAlleles(p13, p23)
    const as4 = childAlleles(p14, p24)
    for (let i1 = 0; i1 < as1.length; i1++) {
        const a1 = as1[i1] ?? _u
        for (let i2 = 0; i2 < as2.length; i2++) {
            const a2 = as2[i2] ?? _u
            for (let i3 = 0; i3 < as3.length; i3++) {
                const a3 = as3[i3] ?? _u
                for (let i4 = 0; i4 < as4.length; i4++) {
                    const a4 = as4[i4] ?? _u
                    const r = action(geneFromAlleles(a1, a2, a3, a4), state)
                    switch (r) {
                        case Flow.Break: return
                        default: break
                    }
                }
            }
        }
    }
}
/**
 * 指定された遺伝子を持つ親を交配したとき生まれる子の、重複のない一覧を返す
 * @internal
 */
export const getChildGenes = (parent1Gene: Gene, parent2Gene: Gene): readonly (readonly [childGene: Gene, count: number])[] => {
    const genes = new Map<Gene, { gene: Gene, count: number }>()
    forEachChildGenes(parent1Gene, parent2Gene, child => {
        let entry = genes.get(child)
        if (entry === undefined) {
            entry = { gene: child, count: 0 }
            genes.set(child, entry)
        }
        entry.count++
    })
    const result: [Gene, number][] = []
    genes.forEach(entry => result.push([entry.gene, entry.count]))
    return result
}

/**
 * 指定された遺伝子を持つ親を交配したとき、🧬は違うが色（指定された色）が同じ子が生まれるかどうかを表す真偽値を返す
 */
const hasDuplicatedChildColor = (kind: FlowerKind, parent1Gene: Gene, parent2Gene: Gene, color: FlowerColor) => {
    let foundGene: Gene | null = null
    let duplicated = false
    forEachChildGenes(parent1Gene, parent2Gene, child => {
        if (flowerColor(kind, child) === color) {
            if (foundGene && foundGene !== child) {
                duplicated = true
                return Flow.Break
            }
            foundGene = child
        }
    })
    return duplicated
}
/**
 * 指定された子🧬を生成する親🧬の交配ペアを列挙する
 * @internal
 */
export const findBreedParents = (kind: FlowerKind, childGene: Gene, options: FilledFindBreedTreeOptions): readonly (readonly [Gene, Gene])[] => {
    const childColor = flowerColor(kind, childGene)
    const result: (readonly [Gene, Gene])[] = []
    const allele1 = getAllele(childGene, 1)
    const allele2 = getAllele(childGene, 2)
    const allele3 = getAllele(childGene, 3)
    const allele4 = getAllele(childGene, 4)
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

                    const parent1Gene = geneFromAlleles(p1[0], p2[0], p3[0], p4[0])
                    const parent2Gene = geneFromAlleles(p1[1], p2[1], p3[1], p4[1])

                    if (options.distinguishedOnlyByColor && hasDuplicatedChildColor(kind, parent1Gene, parent2Gene, childColor)) { continue }
                    result.push([parent1Gene, parent2Gene])
                }
            }
        }
    }
    return result
}

export const forEachBreedParentsOfGenes = (kind: FlowerKind, childGenes: readonly FlowerGene[], action: (parent1: Gene, parent2: Gene, childGeneCount: number) => void, options: FilledFindBreedTreeOptions) => {
    const genes = allGenes(kind)
    const childGeneSet = new Set(childGenes)
    const childColorSet = new Set(childGenes.map(g => flowerColor(kind, g)))

    // 全ての交配ペアを列挙する
    for (let i1 = 0; i1 < genes.length; i1++) {
        const parent1 = genes[i1]!
        for (let i2 = i1; i2 < genes.length; i2++) {
            const parent2 = genes[i2]!

            // 交配ペアから生まれる全ての子を列挙する
            let targetGeneCount = 0
            forEachChildGenes(parent1, parent2, child => {
                if (childGeneSet.has(child)) {

                    // 生まれる子が対象🧬に含まれている
                    targetGeneCount++
                }
                else {
                    // 対象🧬でない子の色が対象🧬の子の色と被る = 色で見分けられないので
                    // 現在の交配ペアを列挙しないようにする
                    if (options.distinguishedOnlyByColor && childColorSet.has(flowerColor(kind, child))) {
                        targetGeneCount = 0
                        return Flow.Break
                    }
                }
            })
            if (0 < targetGeneCount) { action(parent1, parent2, targetGeneCount) }
        }
    }
}

export const findBreedTreeOptionsSpec = {
    /** 交配するとき、子が色で見分けられないなら除外する */
    distinguishedOnlyByColor: optionSpec("boolean", true)
} as const
export type FindBreedTreeOptions = OptionsSpecToOptions<typeof findBreedTreeOptionsSpec>
export type FilledFindBreedTreeOptions = FilledOptions<typeof findBreedTreeOptionsSpec>

type BreedBranch<gene> = readonly [
    kind: "Breed",
    child: gene,
    parent1: BreedTree<gene>,
    parent2: BreedTree<gene>,
]
type BreedRoot<gene> = readonly [
    kind: "Root",
    child: gene,
]
export type BreedMulti<gene = FlowerGene> = readonly [
    kind: "BreedMulti",
    children: readonly [gene, gene, ...gene[]],
    parent1: BreedTree<gene>,
    parent2: BreedTree<gene>,
]
export type BreedTree<gene = FlowerGene> =
    | BreedRoot<gene>
    | BreedBranch<gene>

export const getChildRate = (parent1: Gene, parent2: Gene, child: Gene) => {
    let childGeneCount = 0
    let allGeneCount = 0
    forEachChildGenes(parent1, parent2, someChild => {
        allGeneCount++
        if (someChild === child) {
            childGeneCount++
        }
    })
    if (allGeneCount === 0) { return error("0") }
    return childGeneCount / allGeneCount
}
const getBreedCost = (parent1: Gene, parent2: Gene, child: Gene) => {
    const rate = getChildRate(parent1, parent2, child)

    // 指定された子が生まれる確率が高いほどコストは下がる
    return (1 - rate) +

        // 交配そのもののコスト
        0.1
}
export const getBreedTreeCost = (tree: BreedTree): number => {
    switch (tree[0]) {
        case "Root": return 0
        case "Breed": return getBreedCost(tree[2][1], tree[3][1], tree[1])
    }
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

    const rootSet: ReadonlySet<Gene> = new Set(rootGenes)
    const visitedGeneSet = new Set<Gene>()
    type BreedTreeWithCost = [cost: number, tree: BreedTree]
    const memo = new Map<Gene, BreedTreeWithCost | null>()

    const worker = (child: Gene): BreedTreeWithCost | null => {

        // 始祖の中に子が含まれるなら返す
        if (rootSet.has(child)) {
            const tree: BreedTreeWithCost = [0, ["Root", child]]
            memo.set(child, tree)
            return tree
        }
        // メモ
        const result = memo.get(child)
        if (result !== undefined) { return result }

        // 循環参照
        if (visitedGeneSet.has(child)) { return null }
        visitedGeneSet.add(child)

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
                ["Breed", child, tree1[1], tree2[1]]
            ]
        }

        if (minCostTree == null) {
            memo.set(child, null)
            return null
        }

        visitedGeneSet.delete(child)

        memo.set(child, minCostTree)
        return minCostTree
    }
    return worker(childGene)?.[1]
}

/** ゴール遺伝子を子に含む交配ペアを返す */
const findBreedPairs = (kind: FlowerKind, goals: readonly FlowerGene[], options: FilledFindBreedTreeOptions) => {
    const pairs: { parent1: FlowerGene, parent2: FlowerGene }[] = []
    forEachBreedParentsOfGenes(kind, goals, (parent1, parent2) => {
        pairs.push({ parent1, parent2 })
    }, options)
    return pairs
}

type ArrayMinWorker<element, minLength extends number, fixedElements extends element[]> =
    fixedElements["length"] extends minLength
    ? [...fixedElements, ...element[]]
    : ArrayMinWorker<element, minLength, [...fixedElements, element]>

type ArrayMin<element, minLength extends number> = ArrayMinWorker<element, minLength, []>

const isArrayMin = <T, N extends number>(array: T[], minLength: N): array is ArrayMin<T, N> =>
    array.length >= minLength

export const findBreedTreesOfGoals = (kind: FlowerKind, starts: readonly FlowerGene[], goals: readonly FlowerGene[], options?: FindBreedTreeOptions) => {
    const filledOptions = fillOptions(findBreedTreeOptionsSpec, options)
    const goalSet = new Set(goals)
    const pairs = findBreedPairs(kind, goals, filledOptions)

    // 交配ペアの親を生成する交配木を求める
    const trees = pairs.reduce((result: (BreedMulti | BreedTree)[], { parent1, parent2 }) => {

        // 親がゴールに含まれるなら除外
        if (goalSet.has(parent1) || goalSet.has(parent2)) { return result }

        const tree1 = findBreedTree(kind, starts, parent1)
        if (!tree1) { return result }

        const tree2 = findBreedTree(kind, starts, parent2)
        if (!tree2) { return result }

        const children: FlowerGene[] = []
        const childSet = new Set<FlowerGene>()
        forEachChildGenes(parent1, parent2, child => {
            if (goalSet.has(child) && !childSet.has(child)) {
                children.push(child)
                childSet.add(child)
            }
        })
        if (isArrayMin(children, 2)) {
            result.push(["BreedMulti", children, tree1, tree2])
            return result
        }
        if (isArrayMin(children, 1)) {
            result.push(["Breed", children[0], tree1, tree2])
            return result
        }
        return result
    }, [])
    return trees
}

export type Breed = Readonly<{
    parent1: FlowerGene
    parent2: FlowerGene
    children: readonly [FlowerGene, ...FlowerGene[]]
}>

export const breedTreeToBreeds = (tree: BreedTree, geneSet: Set<FlowerGene>): Breed[] => {
    switch (tree[0]) {
        case "Root": return []
        case "Breed": {
            const [, child, tree1, tree2] = tree
            return [
                ...breedTreeToBreeds(tree1, geneSet),
                ...breedTreeToBreeds(tree2, geneSet),
                ...geneSet.has(child)
                    ? []
                    : (geneSet.add(child), [{
                        parent1: tree1[1],
                        parent2: tree2[1],
                        children: [child],
                    }] as const),
            ]
        }
    }
}
