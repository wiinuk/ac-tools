import * as React from "react"
import * as ReactDOM from "react-dom"

type MyCounterProps = Readonly<{
    name: string
}>
type MyCounterState = Readonly<{
    count: number
}>

class MyCounter extends React.Component<MyCounterProps, MyCounterState> {
    constructor(props: Readonly<MyCounterProps>) {
        super(props)
        this.state = {
            count: 0,
        }
    }
    private _handleClick() {
        console.log("クリックされた")
        this.setState({
            count: this.state.count + 1,
        })
    }
    override render() {
        return <div>
            <h2>{this.props.name}</h2>
            <div>{this.state.count}</div>
            <button onClick={this._handleClick.bind(this)}>Add +1</button>
        </div>
    }
}

class Main extends React.Component {
    override render() {
        return <div>
            <h1>Hello React</h1>
            <MyCounter name="My Counter!"/>
        </div>
    }
}

ReactDOM.render(<Main/>, document.querySelector("#main"))
