import { Configuration } from "webpack"
import path from "path"

const config: Configuration = {
    mode: "development",
    entry: "./src/main.tsx",
    output: {
        path: path.join(__dirname, "docs/js"),
        filename: "main.js",
    },
    module: {
        rules: [
            {
                test: /\.worker\.tsx?$/,
                use: { loader: "worker-loader" },
            },
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: ["/node_modules/"],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/,
                type: 'asset',
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
    },
}

export default config
