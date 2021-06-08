import { findBreedParents, flowerColor, FlowerKind, getChildGenes, _00, _01, _11, _u } from "../src/flower"
import * as q from "qcheck"
import flowerSpec from "../src/flower-spec"

describe("findBreedParents", () => {
    test("ヒヤシンス-00-00-00 を生成する親の確認", () => {
        expect(findBreedParents("ヒヤシンス", [_00, _00, _00, _u], { distinguishedOnlyByColor: true })).toEqual([
            [[0, 0, 0, 2], [0, 0, 0, 2]],
            [[0, 0, 0, 2], [0, 0, 1, 2]],
            [[0, 0, 1, 2], [0, 0, 0, 2]],
            [[0, 0, 1, 2], [0, 0, 1, 2]],
            [[0, 0, 0, 2], [0, 1, 0, 2]],
            [[0, 0, 0, 2], [0, 1, 1, 2]],
            [[0, 0, 1, 2], [0, 1, 0, 2]],
            [[0, 0, 1, 2], [0, 1, 1, 2]],
            [[0, 1, 0, 2], [0, 0, 0, 2]],
            [[0, 1, 0, 2], [0, 0, 1, 2]],
            [[0, 1, 1, 2], [0, 0, 0, 2]],
            [[0, 1, 1, 2], [0, 0, 1, 2]],
            [[0, 1, 0, 2], [0, 1, 0, 2]],
            [[0, 1, 0, 2], [0, 1, 1, 2]],
            [[0, 1, 1, 2], [0, 1, 0, 2]],
            [[0, 1, 1, 2], [0, 1, 1, 2]],
        ])
    })
    test("見分けられる交配のみを対象としているか", () => {
        const kinds = Object.keys(flowerSpec) as readonly string[] as readonly [FlowerKind, ...FlowerKind[]]
        const kind = q.elements(...kinds)
        const allele = q.elements(_00, _01, _11)
        const gene3 = q.tuple(allele, allele, allele, q.pure(_u))
        q.tuple(kind, gene3).check(([kind, childGene]) => {
            const childColor = flowerColor(kind, childGene)
            const pairs = findBreedParents(kind, childGene, { distinguishedOnlyByColor: true })

            pairs.forEach(([p1, p2]) => {
                expect(
                    getChildGenes(p1, p2)
                        .filter(([, g]) => flowerColor(kind, g) === childColor)
                        .length
                ).toEqual(1)
            })
        })
    })
})
