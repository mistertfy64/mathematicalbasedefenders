const path = require("path");

module.exports = {
  entry: "./src/public/js/index.ts",
  externals: {
    "PIXI": "pixi.js",
    "fontfaceobserver": "FontFaceObserver",
    "adaptive-scale": "adaptive-scale"
  },
  target: "web",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: [/node_modules/, /uWebSocket/, /adaptive-scale/, /pixi/]
      },
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: [/node_modules/, /uWebSocket/, /adaptive-scale/, /pixi/],
        include: ["/src/public/js/*"]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "public/js/mathematicalbasedefenders.js",
    path: path.resolve(__dirname, "dist")
  }
};
