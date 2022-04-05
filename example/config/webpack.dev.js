const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: './dist',
    },
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    globalObject: 'this' // workaround for HMR error with web workers, see https://github.com/webpack/webpack/issues/6642
  }
});