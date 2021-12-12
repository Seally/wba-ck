// Run this with:
//     deno run --unstable --allow-read --allow-write .\deploy.ts
import * as flags from "https://deno.land/std@0.108.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.108.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.108.0/fs/mod.ts";

import { walk } from "./walk.ts";

const __filename = path.fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);

const args = flags.parse(Deno.args, {
    boolean: ["force-overwrite", "help", "silent"],
    alias: {
        "force-overwrite": "f",
        help: "h",
        silent: "s",
    },
});

if (args.help) {
    console.log([
        "OPTIONS",
        "--help, -h             Prints this help.",
        "--force-overwrite, -f  Deletes and recreates the output folder without notice.",
        "--silent, -s           Do not prompt for anything. Succeed or fail silently.",
    ].join("\n"));
    Deno.exit();
}

async function _isDirEmpty(dir: string): Promise<boolean> {
    try {
        for await (const _ of Deno.readDir(dir)) {
            return false;
        }
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            throw err;
        }
    }

    return true;
}

try {
    const currentDirName = path.basename(__dirname);
    const outputDir = path.resolve(__dirname, "..", currentDirName + "-output");

    if (await fs.exists(outputDir)) {
        if (args["force-overwrite"]) {
            console.log(
                'Automatically cleaning up directory at "' + outputDir + '"',
            );
            await fs.emptyDir(outputDir);
        } else if (!await _isDirEmpty(outputDir)) {
            if (args.silent) {
                console.error(
                    'Directory "' + outputDir + '" exists and is not empty.',
                );
                Deno.exit(1);
            } else {
                console.log('Output directory "' + outputDir + '" exists.');
                const response = prompt("Delete and rewrite? (y/n)");

                if (response?.toLowerCase() === "y") {
                    await fs.emptyDir(outputDir);
                } else {
                    console.error(
                        'Directory "' + outputDir +
                            '" exists and is not empty.',
                    );
                    Deno.exit(1);
                }
            }
        }
    }

    const fsWalker = walk(__dirname, {
        includeFiles: true,
        includeDirs: false,
        followSymlinks: true,
        skip: [
            path.globToRegExp(path.resolve(__dirname, ".editorconfig")),
            path.globToRegExp(path.resolve(__dirname, "*.ts")),
            path.globToRegExp(path.resolve(__dirname, "*.bat")),
            path.globToRegExp(path.resolve(__dirname, "README.md")),
            path.globToRegExp(path.resolve(__dirname, "deno.jsonc")),
            path.globToRegExp(path.resolve(__dirname, "images/**")),
            path.globToRegExp("**/*.pdb"),
            path.globToRegExp("**/.gitignore"),
            path.globToRegExp("**/.gitattributes"),
            path.globToRegExp("**/meta.ini"),
            path.globToRegExp("**/*.7z"),
            path.globToRegExp("**/.git/**/*"),
            path.globToRegExp("**/.vscode/**/*"),
        ],
    });

    console.log("Copying files:");

    for await (const walkEntry of fsWalker) {
        const subpath = path.relative(__dirname, walkEntry.path);

        const sourcePath = walkEntry.path;
        const targetPath = path.join(outputDir, subpath);
        const targetDir = path.dirname(targetPath);

        console.log('"' + sourcePath + '" => "' + targetPath + '"');

        await Deno.mkdir(targetDir, { recursive: true });
        await Deno.copyFile(sourcePath, targetPath);
    }
} catch (e) {
    console.error(e);
}
