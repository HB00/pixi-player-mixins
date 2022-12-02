const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { ESBuildPlugin, ESBuildMinifyPlugin } = require('esbuild-loader');
const os = require('os');
const fs = require('fs-extra');

const base = __dirname;
const src = path.resolve(base, 'mixins');

const plugins = [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }),
  new ESBuildPlugin()
];

const entry = {};
const mixins = fs.readdirSync(src);
for (const mixin of mixins) {
  const mixinEntry = path.resolve(src, mixin, 'index.js');
  if (fs.existsSync(mixinEntry)) entry[mixin] = [mixinEntry];
}

module.exports = {
  entry,
  output: {
    filename: process.env.NODE_ENV === 'production' ? '[name].min.js' : '[name].js',
    path: path.resolve(base, 'dist'),
    globalObject: 'this',
    library: 'pixi-player-mixins',
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        loader: "esbuild-loader",
        options: {
          loader: 'jsx',
          target: 'es2015'
        }
      },
      {
        test: /\.(css|less)$/,
        use: [
          { loader: "style-loader", options: { attributes: { mira: "editor" } } },
          'css-loader',
          'less-loader',
        ]
      },
      {
        test: /\.(frag|vert|glsl)$/,
        use: 'raw-loader'
      },
      // {
      //   test: /\.wasm$/,
      //   type: "asset/inline"
      // }
    ],
  },
  resolve: {
    // 自动补全的扩展名
    extensions: ['.js', '.jsx', '.vue', '.json', '.ts'],
    fallback: {
      "fs": false,
      "crypto": false,
      "events": false,
      "process": false,
      // "path": require.resolve("path-browserify"),
      "util": false,
    }
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      new ESBuildMinifyPlugin({target: 'es2015'})
    ]
  },
  plugins,
  watchOptions: {
    ignored: /dist/
  },
  externals: [],
};
