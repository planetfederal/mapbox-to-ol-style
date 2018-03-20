const path = require('path');

module.exports = {
  entry: './index.js',
  devtool: 'source-map',
  node: {fs: 'empty'},
  mode: 'development',
  output: {
    path: path.resolve('./dist'), // Path of output file
    filename: 'mb2olstyle.js',
    library: 'mb2olstyle'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          cacheDirectory: true
        }
      }
    ]
  }
};
