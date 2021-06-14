import * as React from "react"
import * as ReactDOM from "react-dom"
import { BreedTreeCalculator } from "./breed-tree-calculator"

const Main = () => {
    return <div>
        <BreedTreeCalculator />
    </div>
}

ReactDOM.render(<Main/>, document.querySelector("#main"))
