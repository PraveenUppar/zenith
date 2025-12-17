"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFinalDist = void 0;
exports.downloadS3Folder = downloadS3Folder;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const s3 = new client_s3_1.S3Client({
    region: "auto",
    endpoint: "http://localhost:9000",
    credentials: {
        accessKeyId: "admin",
        secretAccessKey: "password",
    },
});
async function downloadS3Folder(prefix) {
    // 2. FIX: Use the Command pattern instead of s3.listObjectsV2
    const command = new client_s3_1.ListObjectsV2Command({
        Bucket: "local-outputs", // <--- 3. FIX: Ensure this matches your actual bucket name
        Prefix: prefix,
    });
    // Send the command
    const allFiles = await s3.send(command);
    const allPromises = allFiles.Contents?.map(async ({ Key }) => {
        return new Promise(async (resolve) => {
            if (!Key) {
                resolve("");
                return;
            }
            const finalOutputPath = path_1.default.join(__dirname, Key);
            const outputFile = fs_1.default.createWriteStream(finalOutputPath);
            const dirName = path_1.default.dirname(finalOutputPath);
            if (!fs_1.default.existsSync(dirName)) {
                fs_1.default.mkdirSync(dirName, { recursive: true });
            }
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: "local-outputs", // <--- Ensure consistent bucket name
                Key,
            });
            const data = await s3.send(getCommand);
            if (data.Body instanceof stream_1.Readable) {
                data.Body.pipe(outputFile).on("finish", () => {
                    resolve("");
                });
            }
        });
    }) || [];
    console.log("Downloading...");
    await Promise.all(allPromises?.filter((x) => x !== undefined));
}
const uploadFinalDist = async (id) => {
    const folderPath = path_1.default.join(__dirname, `output/${id}/dist`);
    const allFiles = getAllFiles(folderPath);
    for (const file of allFiles) {
        // Fix path slicing for Windows compatibility
        const relativePath = file.slice(folderPath.length + 1).replace(/\\/g, "/");
        await uploadFile(`dist/${id}/${relativePath}`, file);
    }
};
exports.uploadFinalDist = uploadFinalDist;
const getAllFiles = (folderPath) => {
    let response = [];
    if (fs_1.default.existsSync(folderPath)) {
        const allFilesAndFolders = fs_1.default.readdirSync(folderPath);
        allFilesAndFolders.forEach((file) => {
            const fullPath = path_1.default.join(folderPath, file);
            if (fs_1.default.statSync(fullPath).isDirectory()) {
                response = response.concat(getAllFiles(fullPath));
            }
            else {
                response.push(fullPath);
            }
        });
    }
    return response;
};
const uploadFile = async (fileName, localFilePath) => {
    const fileContent = fs_1.default.readFileSync(localFilePath);
    const command = new client_s3_1.PutObjectCommand({
        Bucket: "local-outputs",
        Key: fileName,
        Body: fileContent,
    });
    await s3.send(command);
    console.log(`Uploaded ${fileName}`);
};
