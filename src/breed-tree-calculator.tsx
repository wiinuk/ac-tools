import * as React from "react"
import { FlowerGene, FlowerColor, FlowerAllele, _00, _01, _11, _u, FlowerKind, geneEquals, flowerColor, flowerIsSeed, forEachFlowerGenes, FindBreedTreeOptions, findBreedTree, breedTreeCost, BreedTree, FlowerGeneKey, geneKey, flowerKinds } from "./flower"

type LeafConditionKind<Key extends string, Leaf> = {
    kind: "Leaf"
    key: Key
    value: Leaf
}
type GeneCondition = LeafConditionKind<"gene", FlowerGene>
type ColorCondition = LeafConditionKind<"color", FlowerColor>
type SeedCondition = LeafConditionKind<"seed", boolean>
type AndCondition = {
    kind: "And"
    color: ColorCondition
    seed: SeedCondition
}
type LeafCondition =
    | GeneCondition
    | ColorCondition
    | SeedCondition

type Condition =
    | LeafCondition
    | AndCondition

const log = (template: TemplateStringsArray, ...values: unknown[]) => {
    let result = template[0]
    for (let i = 1; i < template.length; i++) {
        const vi = i - 1
        result += vi < values.length ? JSON.stringify(values[vi]) : ""
        result += template[i]!
    }
    console.log(result)
}

const showColor = (color: FlowerColor) =>
    // TODO: ローカライズ
    color

const showAllele = (allele: FlowerAllele) => {
    switch (allele) {
        case _00: return "00"
        case _01: return "01"
        case _11: return "11"
        case _u: return null
    }
}
const showGene = (gene: FlowerGene) => {
    const alleles = gene.map(showAllele)
    while (0 !== alleles.length && alleles[alleles.length - 1] === null) {
        alleles.pop()
    }
    return alleles.map(a => a === null ? "??" : a).join("-")
}
const showAnd = ({ color, seed }: AndCondition) => {
    return `${showColor(color.value)}${showSeed(seed)}`
}
const showSeed = ({ value: isSeed }: SeedCondition) => {
    return isSeed ? "種" : "種以外"
}
const showLeaf = (condition: LeafCondition) => {
    switch (condition.key) {
        case "color": return showColor(condition.value)
        case "gene": return showGene(condition.value)
        case "seed": return showSeed(condition)
    }
}
const showCondition = (condition: Condition): string => {
    switch (condition.kind) {
        case "Leaf": return showLeaf(condition)
        case "And": return showAnd(condition)
    }
}
const ConditionList = (props: Readonly<{
    list?: readonly Condition[]
}>) => {
    const items = (props.list ?? []).map((condition, index) => {
        const view = showCondition(condition)
        return <li key={index}>
            <a>{view}</a>
        </li>
    })
    return <ul>
        {...items}
    </ul>
}

const colorCondition = (value: ColorCondition["value"]): ColorCondition => ({ kind: "Leaf", key: "color", value })
const seedCondition = (value: SeedCondition["value"]): SeedCondition => ({ kind: "Leaf", key: "seed", value })
const andCondition = (color: AndCondition["color"], seed: AndCondition["seed"]): AndCondition => ({ kind: "And", color, seed, })
const seedColorCondition = (color: ColorCondition["value"]) =>
    andCondition(colorCondition(color), seedCondition(true))

const evaluateLeaf = (kind: FlowerKind, gene: FlowerGene, condition: LeafCondition) => {
    switch (condition.key) {
        case "gene": return geneEquals(gene, condition.value)
        case "color": return flowerColor(kind, gene) === condition.value
        case "seed": return flowerIsSeed(kind, gene)
    }
}
const evaluateCondition = (kind: FlowerKind, gene: FlowerGene, condition: Condition): boolean => {
    switch (condition.kind) {
        case "Leaf": return evaluateLeaf(kind, gene, condition)
        case "And": return evaluateLeaf(kind, gene, condition.color) && evaluateLeaf(kind, gene, condition.seed)
    }
}
const evaluateOrCondition = (kind: FlowerKind, gene: FlowerGene, conditions: readonly Condition[]) => {
    for (const c of conditions) {
        if (evaluateCondition(kind, gene, c)) { return true }
    }
    return false
}
const getFlowersIn = (kind: FlowerKind, orConditions: readonly Condition[]) => {
    const result: FlowerGene[] = []
    forEachFlowerGenes(kind, gene => {
        if (evaluateOrCondition(kind, gene, orConditions)) {
            result.push(gene)
        }
    })
    return result
}
/** 戻り値はコストが小さい順に並んでいる */
const findBreedTreesOfConditions = (kind: FlowerKind, starts: readonly Condition[], goals: readonly Condition[], options?: FindBreedTreeOptions) => {
    const startGenes = getFlowersIn(kind, starts)
    const goalGenes = getFlowersIn(kind, goals)
    const trees = goalGenes
        .map(goalGene => {
            const tree = findBreedTree(kind, startGenes, goalGene, options)
            log`startGenes: ${startGenes}, goalGene: ${goalGene}, tree: ${tree}`
            return tree
        })
        .filter(x => x !== undefined)
        .map(x => x as NonNullable<typeof x>)
        .sort(breedTreeCost)

    return trees
}

const flowerColorToCssColor = (color: FlowerColor): NonNullable<React.CSSProperties["color"]> => {
    switch (color) {
        case "オレンジ": return "orange"
        case "ピンク": return "pink"
        case "白": return "white"
        case "紫": return "purple"
        case "緑": return "green"
        case "赤": return "red"
        case "青": return "blue"
        case "黄": return "yellow"
        case "黒": return "black"
    }
}
const FlowerInfo = ({ kind, gene }: Readonly<{ kind: FlowerKind, gene: FlowerGene }>) => {
    const color = flowerColor(kind, gene)
    return <span style={{ color: flowerColorToCssColor(color) }}>
        <span>{showColor(color)}</span>
        <span>{showGene(gene)}</span>
    </span>
}

type Breed = {
    parent1: FlowerGene
    parent2: FlowerGene
    child: FlowerGene
}
const BreedDetailView = ({ kind, breed: { parent1, parent2, child } }: Readonly<{ kind: FlowerKind, breed: Breed }>) => {
    return <div className="breed-detail">
        <div>
            <FlowerInfo kind={kind} gene={parent1} />×<FlowerInfo kind={kind} gene={parent2} />
        </div>
        <div>
            →<FlowerInfo kind={kind} gene={child} />
        </div>
    </div>
}

const breedTreeToBreeds = (tree: BreedTree, geneSet: Set<FlowerGeneKey>): Breed[] => {
    switch (tree[0]) {
        case "Root": return []
        case "Breed": {
            const [, child, tree1, tree2] = tree
            const key = geneKey(child)
            const breed =
                geneSet.has(key)
                    ? []
                    : (geneSet.add(key), [{
                        parent1: tree1[1],
                        parent2: tree2[1],
                        child,
                    }])

            return [
                ...breedTreeToBreeds(tree1, geneSet),
                ...breedTreeToBreeds(tree2, geneSet),
                ...breed,
            ]
        }
    }
}
const BreedTreeView = ({ kind, tree }: Readonly<{ kind: FlowerKind, tree: BreedTree }>) => {
    const breeds = breedTreeToBreeds(tree, new Set())
    log`tree: ${JSON.stringify(tree)}`
    log`breeds: ${JSON.stringify(breeds)}`
    const breedViews = breeds.map((breed, index) => <BreedDetailView key={index} kind={kind} breed={breed} />)
    return <div className="breed-tree">
        {...breedViews}
    </div>
}

type CalculationResultProps = {
    kind: FlowerKind
    starts: readonly Condition[]
    goals: readonly Condition[]
}
class CalculationResult extends React.Component<CalculationResultProps> {
    constructor(props: Readonly<CalculationResultProps>) {
        super(props)
        this.state = {}
    }
    override render() {
        const { kind, starts, goals } = this.props
        const trees = findBreedTreesOfConditions(kind, starts, goals, { distinguishedOnlyByColor: false })
        const treeViews = trees.map((tree, index) => <BreedTreeView key={index} kind={kind} tree={tree} />)
        return <section>
            <h3>結果</h3>
            {...treeViews}
        </section>
    }
}

const showFlowerKind = (kind: FlowerKind) =>
    // TODO: ローカライズ
    kind

export const BreedTreeCalculator = (props: Readonly<{
    kind?: FlowerKind
    starts?: readonly Condition[]
    goals?: readonly Condition[]
}>) => {
    const [state, setState] = React.useState({
        kind: props?.kind ?? "コスモス",
        starts: props?.starts ?? [seedColorCondition("赤"), seedColorCondition("白")],
        goals: props?.goals ?? [colorCondition("ピンク")]
    })
    const onSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setState({
            ...state,
            // TODO: 実行時の値のチェック
            kind: event.target.value as FlowerKind,
        })
    }
    const options = flowerKinds.map(kind =>
        <option key={kind} value={kind}>{showFlowerKind(kind)}</option>
    )
    return <article>
        <h2>花の交配手順の検索</h2>
        <section>
            <h3>花の種類
                <select value={state.kind} onChange={onSelectChange}>
                    {...options}
                </select>
            </h3>
        </section>
        <section>
            <h3>持っている花</h3>
            <ConditionList list={...state.starts} />
        </section>
        <section>
            <h3>手に入れたい花</h3>
            <ConditionList list={...state.goals} />
        </section>
        <CalculationResult kind={state.kind} starts={state.starts} goals={state.goals} />
    </article>
}
