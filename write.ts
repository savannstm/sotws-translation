import { spawnSync } from "child_process";
import { copyFile, mkdir, readdir, rm } from "fs/promises";
import psd from "psd.js";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { join } from "path";

async function moveEdited() {
    for (const edited of await readdir("./edited")) {
        await copyFile(`./edited/${edited}`, `./original/${edited}`);
    }
}

async function exportPNG() {
    const psdPath = "./img/translation/Graphics";
    const outputPath = "./output/Graphics";

    await mkdir(outputPath, { recursive: true });

    for (const subdir of await readdir(psdPath)) {
        await mkdir(join(outputPath, subdir), { recursive: true });

        for (const file of await readdir(join(psdPath, subdir))) {
            const psdFile = await psd.open(join(psdPath, subdir, file));
            psdFile.image.saveAsPng(join(outputPath, subdir, file.replace(".psd", ".png")));
        }
    }
}

async function zipDirectory(sourceDir: string, outputPath: string) {
    const blobWriter = new BlobWriter();
    const zipWriter = new ZipWriter(blobWriter);

    async function addFilesToZip(currentPath: string, relativePath = "") {
        const entries = await readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.endsWith("zip")) {
                continue;
            }

            const entryPath = join(currentPath, entry.name);
            const zipPath = join(relativePath, entry.name).replace(/\\/g, "/");

            if (entry.isDirectory()) {
                await addFilesToZip(entryPath, zipPath);
            } else {
                const fileData = await Bun.file(entryPath).arrayBuffer();
                await zipWriter.add(zipPath, new Blob([fileData]).stream());
            }
        }
    }

    await addFilesToZip(sourceDir);

    await zipWriter.close();

    const zipBlob = await blobWriter.getData();
    const arrayBuffer = await zipBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await Bun.write(outputPath, buffer);
}

async function moveData() {
    const ret = spawnSync("git", ["branch", "--show-current"], { encoding: "utf-8" });
    const branch = ret.stdout.trim();

    if (branch === "infinity-unfolds") {
        await rm("./original", { recursive: true, force: true });
        await mkdir("./original");

        for (const entry of await readdir("./data-unfolds")) {
            await copyFile(join("./data-unfolds", entry), join("./original", entry));
        }
    } else if (branch === "main") {
        await rm("./original", { recursive: true, force: true });
        await mkdir("./original");

        for (const entry of await readdir("./data-sotws")) {
            await copyFile(join("./data-sotws", entry), join("./original", entry));
        }
    }

    return branch;
}

async function copyChangeList() {
    for (const entry of await readdir("./")) {
        if (entry.endsWith(".html")) {
            await copyFile(`./${entry}`, `./output/${entry}`);
            return entry.slice(0, 5);
        }
    }
}

const branch = await moveData();
await moveEdited();
spawnSync("rvpacker-txt-rs", ["write"]);

await exportPNG();

const version = await copyChangeList();
const archiveName = branch === "infinity-unfolds" ? `${branch}-${version}` : version;
await zipDirectory("./output", `./output/${archiveName}.zip`);
