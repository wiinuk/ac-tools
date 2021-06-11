const enum State {
    Open = 1,
    Close = 2,
}
type nonNegativeNumber = number
interface Node<V, K> {
    state: State
    vertex: V
    key: K
    cost: nonNegativeNumber
    score: nonNegativeNumber
    parent: Node<V, K> | null
}
type SolveResult<V> =
    | { success: true, path: [V, ...V[]] }
    | { success: false, path: V[] }

interface SolveOptions<V, K> {
    getHeuristicCost?: (vertex1: V, vertex2: V) => nonNegativeNumber
    getKey?: (vertex: V) => K
    doYield?: () => Promise<void> | undefined
}
type GetEdges<V> = (start: V, pushEdge: (end: V, cost: nonNegativeNumber) => void) => void
const getNow = Date.now
class SingleSolver<V, K> {
    constructor(readonly nodePool: Node<unknown, unknown>[]) { }

    readonly nodes: Map<K, Node<V, K>> = new Map()
    readonly opens: Node<V, K>[] = []
    opensIsDirty = false

    getEdges!: GetEdges<V>
    getHeuristicCost!: SolveOptions<V, K>["getHeuristicCost"]
    getKey!: SolveOptions<V, K>["getKey"]
    doYield!: SolveOptions<V, K>["doYield"]
    goal!: V

    currentNode!: Node<V, K>
    readonly openEndNode = (end: V, cost: nonNegativeNumber) => {
        const node = this.currentNode
        openIfNone(this, end, node.cost + cost, node)
    }

    nextYieldMs!: number
    readonly defaultYield = () => {
        const now = getNow()
        if (this.nextYieldMs <= now) {
            this.nextYieldMs = now + 5
            return new Promise<void>(onSuccess => setTimeout(onSuccess, 0))
        }
        return
    }
}

const rentNode = <V, K>(solver: SingleSolver<V, K>, state: State, cost: nonNegativeNumber, score: nonNegativeNumber, parent: Node<V, K> | null, vertex: V, key: K) => {
    const node: Node<V, K> = solver.nodePool.pop() ?? Object.create(null)
    node.state = state
    node.cost = cost
    node.score = score
    node.parent = parent
    node.vertex = vertex
    node.key = key
    return node
}
const returnNode = <V, K>(solver: SingleSolver<V, K>, node: Node<V, K>) => {
    node.vertex = undefined as unknown as V
    node.key = undefined as unknown as K
    node.parent = null
    solver.nodePool.push(node)
}
const getKey = <T, K>(solver: SingleSolver<T, K>, vertex: T) =>
    solver.getKey?.(vertex) ?? vertex as unknown as K

const doYield = <T, K>(solver: SingleSolver<T, K>) =>
    solver.doYield?.() ?? solver.defaultYield()

const openIfNone = <T, K>(solver: SingleSolver<T, K>, vertex: T, cost: number, parent: Node<T, K> | null) => {
    const key = getKey(solver, vertex)
    if (solver.nodes.has(key)) { return }

    const heuristic = solver.getHeuristicCost?.(vertex, solver.goal) ?? 0
    const node = rentNode(
        solver,
        State.Open,
        cost,
        cost + heuristic,
        parent,
        vertex,
        key,
    )
    solver.nodes.set(key, node)
    solver.opens.push(node)
    solver.opensIsDirty = true
}
const compareNode = <V, K>(node1: Node<V, K>, node2: Node<V, K>) => {
    const s1 = node1.score
    const s2 = node2.score
    if (s1 === s2) { return node2.cost - node1.cost }
    return s2 - s1
}
const popOpenNode = <V, K>(solver: SingleSolver<V, K>) => {
    const { opens } = solver
    if (solver.opensIsDirty) {
        opens.sort(compareNode)
        solver.opensIsDirty = false
    }
    for (; ;) {
        const node = opens.pop()
        if (node && node.state !== State.Open) { continue }
        return node
    }
}
const getPath = <V, K>(goalNode: Node<V, K>) => {
    const path: [V, ...V[]] = [goalNode.vertex]
    for (let node = goalNode.parent; node !== null; node = node.parent) {
        path.push(node.vertex)
    }
    path.reverse()
    return path
}
const makeFailure = <V>(): SolveResult<V> => ({ success: false, path: [] })
const makeSuccess = <V, K>(node: Node<V, K>) => ({ success: true, path: getPath(node) })
function returnNodeToThisSolver<V, K>(this: SingleSolver<V, K>, node: Node<V, K>) {
    returnNode(this, node)
}

export class Solver {
    private _solverPool: SingleSolver<unknown, unknown>[] = []
    private _nodePool: Node<unknown, unknown>[] = []
    private _rentSingleSolver<V, K>(goal: V, getEdges: GetEdges<V>, options: Readonly<SolveOptions<V, K>> | undefined): SingleSolver<V, K> {
        const solver = this._solverPool.pop() as SingleSolver<V, K> ?? new SingleSolver(this._nodePool)
        solver.getEdges = getEdges
        solver.getHeuristicCost = options?.getHeuristicCost
        solver.getKey = options?.getKey
        solver.goal = goal
        solver.doYield = options?.doYield
        return solver
    }
    private _returnSingleSolver<V, K>(solver: SingleSolver<V, K>) {
        solver.currentNode = undefined as unknown as (typeof solver)["currentNode"]
        solver.getEdges = undefined as unknown as (typeof solver)["getEdges"]
        solver.getHeuristicCost = undefined as unknown as (typeof solver)["getHeuristicCost"]
        solver.getKey = undefined as unknown as (typeof solver)["getKey"]
        solver.goal = undefined as unknown as (typeof solver)["goal"]
        solver.doYield = undefined as unknown as (typeof solver)["doYield"]
        solver.nodes.forEach(returnNodeToThisSolver, solver)
        solver.nodes.clear()
        solver.opens.length = 0
        solver.opensIsDirty = false
        solver.nextYieldMs = 0
        this._solverPool.push(solver as SingleSolver<unknown, unknown>)
    }
    async solve<V, K>(start: V, goal: V, getEdges: GetEdges<V>, options?: Readonly<SolveOptions<V, K>>): Promise<SolveResult<V>> {
        const solver = this._rentSingleSolver(goal, getEdges, options)
        try {
            const is = Object.is
            const goalKey = getKey(solver, goal)
            const getEdges = solver.getEdges
            const openEndNode = solver.openEndNode

            // スタートノードを Open リストに追加
            openIfNone(solver, start, 0, null)

            for (; ;) {

                // 実行を譲る
                const p = doYield(solver)
                if (p) { await p }

                // 最もスコアの小さい Open ノードをリストから抜き出す
                const node = popOpenNode(solver)

                // Open リストが空なのでゴールにたどり着ける道は無い
                if (node == null) { return makeFailure() }

                // ノードはゴールだったので道を返す
                if (is(node.key, goalKey)) { return makeSuccess(node) }

                // ノードを Close にする
                node.state = State.Close

                // 現在のノードからたどれるノードを Open リストに追加
                solver.currentNode = node
                getEdges(node.vertex, openEndNode)
            }
        }
        finally {
            this._returnSingleSolver(solver)
        }
    }
}
