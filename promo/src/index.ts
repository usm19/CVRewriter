import { registerRoot, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { RemotionRoot } from "./Root";

loadFont({ family: "Outfit", url: staticFile("outfit-latin-wght-normal.woff2"), weight: "100 900" });

registerRoot(RemotionRoot);
