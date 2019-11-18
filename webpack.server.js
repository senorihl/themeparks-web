const path = require('path');
const nodeExternals = require('webpack-node-externals');

const {
    NODE_ENV = 'production',
} = process.env;

module.exports = {
    mode: NODE_ENV,
    target: 'node',
    entry: path.resolve(__dirname, 'server/index.js'),
    externals: [ nodeExternals() ],
    output: {
        path: __dirname,
        filename: `server.${NODE_ENV}.js`,
        publicPath: process.cwd(),
    },
};
