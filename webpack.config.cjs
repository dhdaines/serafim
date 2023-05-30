"use strict";
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  output: {
    clean: true,
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new MiniCssExtractPlugin(),
  ],
  devServer: {
    open: true,
    host: "localhost",
    watchFiles: ["./src/index.html"],
  },
  module: {
    rules: [
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: "ts-loader",
        exclude: "/node_modules/",
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    extensionAlias: {
      ".ts": [".js", ".ts"],
      ".cts": [".cjs", ".cts"],
      ".mts": [".mjs", ".mts"],
    },
  },
};
