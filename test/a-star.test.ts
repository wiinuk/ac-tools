import * as AStar from "../src/a-star"

namespace Maze {
    const o = 0
    const x = 1
    const map = [
        [o, o, o, o, o],
        [o, o, x, o, o],
        [o, o, x, o, x],
        [o, x, x, o, o],
        [o, o, o, o, o],
    ] as const
    export type vertex = readonly [number, number]
    export const start: vertex = [1, 1] as const
    export const goal: vertex = [4, 4] as const
    export const getEdges = ([x, y]: vertex, pushEdge: (end: vertex, cost: number) => void) => {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const x2 = x + i
                const y2 = y + j
                if (!(x2 === x && y2 === y) && map[y2]?.[x2] === o) {
                    pushEdge([x2, y2], 1)
                }
            }
        }
    }
    export const getKey = ([x, y]: vertex) => `${x},${y}`
    export const getHeuristicCost = ([x1, y1]: vertex, [x2, y2]: vertex) => {
        const dx = x2 - x1
        const dy = y2 - y1
        const h = Math.max(dx, dy)
        expect(h).toBeGreaterThanOrEqual(0)
        return h
    }
    export const result = {
        success: true,
        path: [
            [1, 1],
            [2, 0],
            [3, 1],
            [3, 2],
            [4, 3],
            [4, 4],
        ],
    } as const
}
describe("a-star", () => {
    const solver = new AStar.Solver()

    test("迷路", async () => {
        const result = await solver.solve(Maze.start, Maze.goal, Maze.getEdges, Maze)
        expect(result).toEqual(Maze.result)
    })
    test("迷路 - 探索順", async () => {
        const visitedVertexes: Maze.vertex[] = []
        const result = await solver.solve(Maze.start, Maze.goal, (position, pushEdge) => {
            visitedVertexes.push(position)
            Maze.getEdges(position, pushEdge)
        }, Maze)
        expect(result).toEqual(Maze.result)
        expect(visitedVertexes).toStrictEqual([
            [1, 1],
            [1, 2],
            [2, 0],
            [1, 0],
            [0, 2],
            [0, 1],
            [0, 0],
            [3, 1],
            [3, 2],
            [4, 3],
            [3, 3],
        ])
    })
    test("doYield オプションが使われている", async () => {
        let using = false
        const result = await solver.solve(0, 3, (v, pushEdge) => {
            pushEdge(v + 1, 1)
            pushEdge(v - 1, 1)
        }, {
            doYield: () => { using = true; return undefined }
        })
        expect(result).toStrictEqual({
            success: true,
            path: [0, 1, 2, 3],
        })
        expect(using).toBe(true)
    })
    test("冪等性", async () => {

        // 繰り返し実行する
        for (let i = 0; i < 3; i++) {
            const results = await Promise.all([1, 2, 3].map(() =>
                solver.solve(0, 3, (v, pushEdge) => {
                    pushEdge(v + 1, 1)
                    pushEdge(v - 1, 1)
                }, {
                    // できる限り細かく分割して実行する
                    doYield: () => new Promise(onSuccess => setTimeout(onSuccess, 0))
                })
            ))
            results.forEach(result => {
                expect(result).toEqual({
                    success: true,
                    path: [0, 1, 2, 3],
                })
            })
        }
    })
})
