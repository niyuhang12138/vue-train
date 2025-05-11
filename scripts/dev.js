const path = require("path");
// const { build } = require("esbuild");
const esbuild = require("esbuild");

// 解析用户执行命令的参数
const args = require("minimist")(process.argv.slice(2)); // 解析用户执行命令的参数

// 打包的模块
const target = args._[0] || "reactivity";
// 打包的格式
const format = args.f || "global";

// 读取package.json
const pkg = require(path.resolve(
    __dirname,
    `../packages/${target}/package.json`
));

// 确定打包格式 iife cjs esm
const outputFormat = format.startsWith("global")
    ? "iife"
    : format === "cjs"
    ? "cjs"
    : "esm";

// 输出文件
const outfile = path.resolve(
    __dirname,
    `../packages/${target}/dist/${target}.${outputFormat}.js`
);

// 打包函数, 调用esbuild打包
async function build() {
    let ctx = await esbuild.context({
        entryPoints: [
            path.resolve(__dirname, `../packages/${target}/src/index.ts`),
        ],
        outfile,
        bundle: true,
        sourcemap: true,
        format: outputFormat,
        globalName: pkg.buildOptions?.name,
        platform: outputFormat === "cjs" ? "node" : "browser",
    });
    await ctx.watch();
}

// 打包
build()
    .then(() => {
        console.log("watching~~~~");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
