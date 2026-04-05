const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  const port = Number(process.env.PORT) || 3000;

  return {
    entry: "./src/main.tsx",
    output: {
      path: path.resolve(__dirname, "dist/public"),
      filename: "assets/[name]-[contenthash].js",
      publicPath: "/",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      symlinks: false,
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "../../attached_assets"),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules\/(?!@workspace)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                ["@babel/preset-env", { targets: { browsers: ["last 2 versions"] } }],
                ["@babel/preset-react", { runtime: "automatic" }],
                "@babel/preset-typescript",
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader",
          ],
        },
        {
          test: /\.(png|jpg|gif|svg|ico|webp|apk)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name]-[hash][ext]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "public",
            to: ".",
            globOptions: { ignore: ["**/.DS_Store"] },
          },
        ],
      }),
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: "assets/[name]-[contenthash].css",
            }),
          ]
        : []),
    ],
    devServer: {
      port,
      host: "0.0.0.0",
      historyApiFallback: true,
      hot: true,
      allowedHosts: "all",
    },
    devtool: isProduction ? "source-map" : "eval-source-map",
  };
};
