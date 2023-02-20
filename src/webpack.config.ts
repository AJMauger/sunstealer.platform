import webpack from "webpack";
import NodemonPlugin from "nodemon-webpack-plugin"

const config: webpack.Configuration[] = [
    {
      mode: "development",

      devtool: "inline-source-map",

      entry: "./src/server/index.ts",

      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: ["ts-loader"],
            exclude: /node_modules/
          }
        ]
      },

      output: {
        filename: "./index.js",
      },

      plugins: [
        new NodemonPlugin()
      ],

      resolve: {
        extensions: [".ts", ".js"],
      },

      target: "node",
    }
];

export default config;
