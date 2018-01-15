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
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
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
        plugins: [
          new webpack.optimize.CommonsChunkPlugin({
            name: "vendor",
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
      }
    );
  }
};
