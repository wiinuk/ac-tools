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
})
