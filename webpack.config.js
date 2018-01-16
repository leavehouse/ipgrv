const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const merge = require('webpack-merge');
const path = require('path');
const webpack = require('webpack');

const PATHS = {
  src: path.join(__dirname, "src"),
  dist: path.join(__dirname, "dist"),
};

const commonConfig = {
  entry: {
    app: ['babel-polyfill', path.join(PATHS.src, 'app.js')],
  },
  output: {
    path: PATHS.dist,
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader', 'eslint-loader'],
      },
      {
        test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[ext]',
          },
        },
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'ipgrv',
      template: './src/assets/index.html',
    })
  ],
};

module.exports = env => {
  if (env === "production") {
    return merge(commonConfig,
      {
        entry: {
          vendor: [
            "base-x", "diff", "hyperapp", "hyperapp-hash-router", "marked",
            "prismjs"
          ],
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: ExtractTextPlugin.extract({
                use: 'css-loader',
                fallback: 'style-loader'
              }),
            },
          ]
        },
        plugins: [
          new CleanWebpackPlugin([PATHS.dist]),
          new webpack.optimize.CommonsChunkPlugin({
            name: "vendor",
          }),
          new ExtractTextPlugin({
            allChunks: true,
            filename: "styles.css"
          }),
        ],
      }
    );
  } else {
    return merge(commonConfig,
      {
        devServer: {
          contentBase: PATHS.dist,
          host: process.env.HOST, // Defaults to `localhost`
          port: process.env.PORT || "8000",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: ['style-loader', 'css-loader'],
            },
          ]
        },
      }
    );
  }
};
