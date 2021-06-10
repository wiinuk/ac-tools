import * as AStar from "../src/a-star"

describe("a-star", () => {
    test("迷路", async () => {
        const o = 0
        const x = 1
        const map = [
            [o, o, o, o, o],
            [o, o, x, o, o],
            [o, o, x, o, x],
            [o, x, x, o, o],
            [o, o, o, o, o],
        ] as const
        const start: readonly [number, number] = [1, 1] as const
        const goal = [4, 4] as const

        const solver = new AStar.Solver()
        const result = await solver.solve(start, goal, ([x, y], pushEdge) => {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const x2 = x + i
                    const y2 = y + j
                    if (!(x2 === x && y2 === y) && map[y2]?.[x2] === o) {
                        pushEdge([x2, y2], 1)
                    }
                }
            }
        }, {
            getKey([x, y]) { return `${x},${y}` },
            getHeuristicCost([x1, y1], [x2, y2]) {
                const dx = x2 - x1
                const dy = y2 - y1
                const h = Math.max(dx, dy)
                expect(h).toBeGreaterThanOrEqual(0)
                return h
            },
        })
        expect(result).toEqual({
            success: true,
            path: [
                [1, 1],
                [2, 0],
                [3, 1],
                [3, 2],
                [4, 3],
                [4, 4],
            ],
        })
    })
    test("doYield オプションが使われている", async () => {
        const solver = new AStar.Solver()
        let using = false
        solver.solve(0, 3, (v, pushEdge) => {
            pushEdge(v + 1, 1)
            pushEdge(v - 1, 1)
        }, {
            doYield: () => { using = true; return undefined }
        })
        expect(using).toBe(true)
    })
    test("冪等性", async () => {
        const solver = new AStar.Solver()
        const solveAsync = () =>
            solver.solve(0, 3, (v, pushEdge) => {
                pushEdge(v + 1, 1)
                pushEdge(v - 1, 1)
            }, {
                // できる限り並列に実行する
                doYield: () => new Promise(onSuccess => setTimeout(onSuccess, 0))
            })

        for (let i = 0; i < 3; i++) {
            const results = await Promise.all([1, 2, 3].map(solveAsync))
            results.forEach(result => {
                expect(result).toEqual({
                    success: true,
                    path: [0, 1, 2, 3],
                })
            })
        }
    })
})
