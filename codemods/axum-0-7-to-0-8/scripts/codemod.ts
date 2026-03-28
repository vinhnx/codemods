import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

const ROUTE_METHOD_PATTERN = String.raw`((?:\.|::)(?:route|route_service|nest|nest_service)\(\s*)`;

function isLikelyAxumSource(source: string): boolean {
    return /\baxum::|\buse\s+axum(?:::{1,2}|\s*[{;])/.test(source);
}

function isLikelyCargoToml(source: string): boolean {
    return /^\s*\[(?:package|workspace|dependencies|dev-dependencies|build-dependencies)/m.test(
        source,
    );
}

function migrateAxumCargoToml(source: string): string {
    let updated = source;

    updated = updated.replace(
        /^(\s*axum\s*=\s*")0\.7(?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        '$10.8$2',
    );

    updated = updated.replace(
        /(\baxum\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.7(?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        '$10.8$2',
    );

    return updated;
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

    if (isLikelyCargoToml(source)) {
        return migrateAxumCargoToml(source);
    }

    if (!isLikelyAxumSource(source)) {
        return source;
    }

    source = replaceQuotedRoutePaths(source);
    source = replaceRawRoutePaths(source);

    return source;
};

export default transform;
