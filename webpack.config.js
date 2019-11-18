const path = require('path');
const ManifestPlugin = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

const {
    NODE_ENV = 'production',
} = process.env;

module.exports = {
    mode: NODE_ENV,
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    // Translates CSS into CommonJS
                    'css-loader',
                    {
                        loader: 'postcss-loader', // Run postcss actions
                        options: {
                            plugins: function () { // postcss plugins, can be exported to postcss.config.js
                                return [
                                    require('autoprefixer')
                                ];
                            }
                        }
                    },
                    // Compiles Sass to CSS
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                            sassOptions: {
                                fiber: require('fibers'),
                            },
                        },
                    },
                ],
            },
        ],
    },
    entry: {
        app: [
            path.resolve(__dirname, 'assets/scss/app.scss'),
            path.resolve(__dirname, 'assets/js/app.js'),
        ],
        park: path.resolve(__dirname, 'assets/js/park.js'),
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: NODE_ENV === 'production' ? '[name].[contenthash].js' : '[name].bundle.js',
        publicPath: '/',
    },
    plugins: [
        new ManifestPlugin({
            basePath: '/'
        }),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // all options are optional
            filename: NODE_ENV === 'production' ? '[name].[contenthash].css' : '[name].css',
            chunkFilename: '[id].css',
            ignoreOrder: false, // Enable to remove warnings about conflicting order
        }),
    ]
};
