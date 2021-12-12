// Documentation and interface for walk were adapted from Go
// https://golang.org/pkg/path/filepath/#Walk
// Copyright 2009 The Go Authors. All rights reserved. BSD license.
import {
    basename,
    join,
    normalize,
} from "https://deno.land/std@0.108.0/path/mod.ts";

export interface WalkOptions {
    maxDepth?: number;
    includeFiles?: boolean;
    includeDirs?: boolean;
    followSymlinks?: boolean;
    exts?: string[];
    match?: RegExp[];
    skip?: RegExp[];
}

/** Create WalkEntry for the `path` asynchronously */
async function _createWalkEntry(path: string): Promise<WalkEntry> {
    path = normalize(path);
    const name = basename(path);

    const [realPath, info] = await Promise.all([
        Deno.realPath(path),
        Deno.stat(path),
    ]);

    return {
        path,
        realPath,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink,
    };
}

function _include(
    path: string,
    exts?: string[],
    match?: RegExp[],
    skip?: RegExp[],
): boolean {
    if (exts && !exts.some((ext): boolean => path.endsWith(ext))) {
        return false;
    }
    if (match && !match.some((pattern): boolean => !!path.match(pattern))) {
        return false;
    }
    if (skip && skip.some((pattern): boolean => !!path.match(pattern))) {
        return false;
    }
    return true;
}

function _wrapErrorWithRootPath(err: unknown, root: string) {
    if (err instanceof Error && "root" in err) return err;
    const e = new Error() as Error & { root: string };
    e.root = root;
    e.message = err instanceof Error
        ? `${err.message} for path "${root}"`
        : `[non-error thrown] for path "${root}"`;
    e.stack = err instanceof Error ? err.stack : undefined;
    e.cause = err instanceof Error ? err.cause : undefined;
    return e;
}

export interface WalkEntry extends Deno.DirEntry {
    path: string;
    realPath: string;
}

/** Walks the file tree rooted at root, yielding each file or directory in the
 * tree filtered according to the given options. The files are walked in lexical
 * order, which makes the output deterministic but means that for very large
 * directories walk() can be inefficient.
 *
 * Options:
 * - maxDepth?: number = Infinity;
 * - includeFiles?: boolean = true;
 * - includeDirs?: boolean = true;
 * - followSymlinks?: boolean = false;
 * - exts?: string[];
 * - match?: RegExp[];
 * - skip?: RegExp[];
 *
 * ```ts
 *       import { walk } from "./walk.ts";
 *       import { assert } from "../testing/asserts.ts";
 *
 *       for await (const entry of walk(".")) {
 *         console.log(entry.path);
 *         assert(entry.isFile);
 *       }
 * ```
 *
 * This is a modified version of fs.walk() from the Deno standard library so we
 * can work with symlinks using the base path instead of the real path:
 *     https://github.com/denoland/deno_std/blob/main/fs/walk.ts
 */
export async function* walk(root: string, {
    maxDepth = Infinity,
    includeFiles = true,
    includeDirs = true,
    followSymlinks = false,
    exts = undefined,
    match = undefined,
    skip = undefined,
}: WalkOptions = {}): AsyncIterableIterator<WalkEntry> {
    if (maxDepth < 0) {
        return;
    }

    if (includeDirs && _include(root, exts, match, skip)) {
        yield await _createWalkEntry(root);
    }

    if (maxDepth < 1 || !_include(root, undefined, undefined, skip)) {
        return;
    }

    try {
        for await (const entry of Deno.readDir(root)) {
            const path = join(root, entry.name);
            let realPath = path;

            if (entry.isSymlink) {
                if (followSymlinks) {
                    realPath = await Deno.realPath(path);
                } else {
                    continue;
                }
            }

            if (entry.isFile) {
                if (includeFiles && _include(path, exts, match, skip)) {
                    yield { path, realPath, ...entry };
                }
            } else {
                yield* walk(path, {
                    maxDepth: maxDepth - 1,
                    includeFiles,
                    includeDirs,
                    followSymlinks,
                    exts,
                    match,
                    skip,
                });
            }
        }
    } catch (err) {
        throw _wrapErrorWithRootPath(err, root);
    }
}
