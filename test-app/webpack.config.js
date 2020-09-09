const path = require('path');
const fs = require('fs');
let entries = {
    index: './src/webrtc.ts'
}
// add project base file
if (fs.existsSync(path.resolve(__dirname, `src/project.ts`))) {
    entries["project"] = `./src/project.ts`;
}
module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: entries,
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'public'),
    },
    devServer: {
        contentBase: path.join(__dirname, 'public')
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.glsl$/i,
                use: 'raw-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
}