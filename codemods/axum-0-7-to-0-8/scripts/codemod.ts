import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

const ROUTE_METHOD_PATTERN = String.raw`((?:\.|::)(?:route|route_service|nest|nest_service)\(\s*)`;

function isLikelyAxumSource(source: string): boolean {
    return /\baxum::|\buse\s+axum(?:::{1,2}|\s*[{;])/.test(source);
}

function transformRoutePath(path: string): string {
    if (!path.startsWith("/")) {
        return path;
    }

    let rewritten = path.replace(/\/:([A-Za-z_][A-Za-z0-9_]*)/g, "/{$1}");

    rewritten = rewritten.replace(/\/\*([A-Za-z_][A-Za-z0-9_]*)/g, "/{*$1}");

    return rewritten;
}

function replaceQuotedRoutePaths(source: string): string {
    const normalStringPattern = new RegExp(
        `${ROUTE_METHOD_PATTERN}"((?:[^"\\\\]|\\\\.)*)"`,
        "g",
    );

    return source.replace(
        normalStringPattern,
        (_, prefix: string, path: string) => {
            return `${prefix}"${transformRoutePath(path)}"`;
        },
    );
}

function replaceRawRoutePaths(source: string): string {
    const rawStringPattern = new RegExp(
        `${ROUTE_METHOD_PATTERN}r(#{0,10})"([\\s\\S]*?)"\\2`,
        "g",
    );

    return source.replace(
        rawStringPattern,
        (_, prefix: string, hashes: string, path: string) => {
            return `${prefix}r${hashes}"${transformRoutePath(path)}"${hashes}`;
        },
    );
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (!isLikelyAxumSource(source)) {
        return source;
    }

    source = replaceQuotedRoutePaths(source);
    source = replaceRawRoutePaths(source);

    return source;
};

export default transform;
