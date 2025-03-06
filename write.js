const { spawnSync } = require("child_process");
const { copyFileSync, mkdirSync, readdirSync } = require("fs");
const psd = require("psd.js");

function moveEdited() {
    for (const edited of readdirSync("./edited")) {
        copyFileSync(`./edited/${edited}`, `./original/${edited}`);
    }
}

function exportPNG() {
    const psdPath = "./img/translation/Graphics";

    mkdirSync("./output/Graphics", { recursive: true });

    for (const subdir of readdirSync(psdPath)) {
        mkdirSync(`./output/Graphics/${subdir}`, { recursive: true });

        for (const file of readdirSync(`./img/translation/Graphics/${subdir}`)) {
            const psdFile = psd.fromFile(`./img/translation/Graphics/${subdir}/${file}`);
            psdFile.parse();
            psdFile.image.saveAsPng(`./output/Graphics/${subdir}/${file.replace(".psd", ".png")}`);
        }
    }
}

moveEdited();
spawnSync("rvpacker-txt-rs", ["write"], { stdout: "inherit" });

exportPNG();
