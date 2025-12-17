"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const aws_js_1 = require("./aws.js");
const utils_js_1 = require("./utils.js");
const subscriber = (0, redis_1.createClient)();
subscriber.connect();
async function main() {
    console.log("Deploy Service Running... Waiting for jobs.");
    while (true) {
        try {
            // Simple blocking pop. It waits forever (0) until an item arrives.
            const res = await subscriber.brPop("build-queue", 0);
            // In 'redis' v4, res is an object { key: string, element: string }
            // @ts-ignore
            const id = res.element;
            if (id) {
                console.log(`Processing Job: ${id}`);
                // 1. Download Code
                await (0, aws_js_1.downloadS3Folder)(`output/${id}`);
                console.log("Downloaded code from S3");
                // 2. Build Code
                console.log(`Building project (ID: ${id})...`);
                await (0, utils_js_1.buildProject)(id);
                console.log("Build Complete!");
                // 3. Upload built assets
                await (0, aws_js_1.uploadFinalDist)(id);
                console.log("Deployed!");
            }
        }
        catch (error) {
            console.error("Error processing build:", error);
            // Wait a bit before retrying to avoid infinite error loops
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}
main();
