import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command, // <--- 1. Import this
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const s3 = new S3Client({
  region: "auto",
  endpoint: "http://localhost:9000",
  credentials: {
    accessKeyId: "admin",
    secretAccessKey: "password",
  },
});

export async function downloadS3Folder(prefix: string) {
  // 2. FIX: Use the Command pattern instead of s3.listObjectsV2
  const command = new ListObjectsV2Command({
    Bucket: "local-outputs", // <--- 3. FIX: Ensure this matches your actual bucket name
    Prefix: prefix,
  });

  // Send the command
  const allFiles = await s3.send(command);

  const allPromises =
    allFiles.Contents?.map(async ({ Key }) => {
      return new Promise(async (resolve) => {
        if (!Key) {
          resolve("");
          return;
        }

        const finalOutputPath = path.join(__dirname, Key);
        const outputFile = fs.createWriteStream(finalOutputPath);
        const dirName = path.dirname(finalOutputPath);

        if (!fs.existsSync(dirName)) {
          fs.mkdirSync(dirName, { recursive: true });
        }

        const getCommand = new GetObjectCommand({
          Bucket: "local-outputs", // <--- Ensure consistent bucket name
          Key,
        });

        const data = await s3.send(getCommand);

        if (data.Body instanceof Readable) {
          data.Body.pipe(outputFile).on("finish", () => {
            resolve("");
          });
        }
      });
    }) || [];

  console.log("Downloading...");
  await Promise.all(allPromises?.filter((x) => x !== undefined));
}

export const uploadFinalDist = async (id: string) => {
  const folderPath = path.join(__dirname, `output/${id}/dist`);
  const allFiles = getAllFiles(folderPath);

  for (const file of allFiles) {
    // Fix path slicing for Windows compatibility
    const relativePath = file.slice(folderPath.length + 1).replace(/\\/g, "/");
    await uploadFile(`dist/${id}/${relativePath}`, file);
  }
};

const getAllFiles = (folderPath: string): string[] => {
  let response: string[] = [];
  if (fs.existsSync(folderPath)) {
    const allFilesAndFolders = fs.readdirSync(folderPath);
    allFilesAndFolders.forEach((file) => {
      const fullPath = path.join(folderPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        response = response.concat(getAllFiles(fullPath));
      } else {
        response.push(fullPath);
      }
    });
  }
  return response;
};

const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const command = new PutObjectCommand({
    Bucket: "local-outputs",
    Key: fileName,
    Body: fileContent,
  });
  await s3.send(command);
  console.log(`Uploaded ${fileName}`);
};
