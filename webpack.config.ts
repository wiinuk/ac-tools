module.exports = {
    mode: "development",
    entry: "./src/main.tsx",
    output: {
        path: `${__dirname}/docs/js`,
        filename: "main.js",
    },
    module: {
        rules: [
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
    target: ["web", "es5"],
}
