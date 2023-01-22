import * as esbuild from "esbuild";
import * as fs from "fs";
import { configBackend } from "./src/config";

if (fs.existsSync("./dist")) fs.rmSync("./dist", { recursive: true, force: true });

fs.mkdirSync("./dist");

fs.readdirSync("./src").forEach((file) => {
	esbuild.buildSync({
		entryPoints: [`./src/${file}`],
		bundle: false,
		outfile: `./dist/${file}`,
		target: "es2019",
		format: "cjs",
		minify: true,
		sourcemap: true,
	});

	// Remove the .ts extension
	fs.rename(`./dist/${file}`, `./dist/${file.replace(".ts", ".js")}`, (err) => {
		if (err) throw err;
	});
});
