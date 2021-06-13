import * as React from "react"
import { BreedTreeView } from "./breed-tree-calculator/breed-tree-view"
import { andCondition, colorCondition, ColorCondition, Condition, evaluateOrCondition, seedCondition } from "./breed-tree-calculator/condition"
import { ConditionList } from "./breed-tree-calculator/condition-list"
import { FlowerGene, _00, _01, _11, _u, FlowerKind, forEachFlowerGenes, FindBreedTreeOptions, findBreedTree, breedTreeCost, flowerKinds } from "./flower"
import { log } from "./helpers"

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

const seedColorCondition = (color: ColorCondition["value"]) =>
    andCondition(colorCondition(color), seedCondition(true))

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
