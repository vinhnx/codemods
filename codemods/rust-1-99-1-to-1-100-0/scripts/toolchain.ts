import { updatePins } from "./pins";

export default async function transform(root: any) { return updatePins(root, "toolchain"); }
