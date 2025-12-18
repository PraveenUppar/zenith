import express from "express";
import { simpleGit } from "simple-git";
import { getAllFiles } from "./utils.js";
import path from "path";

const app = express();
app.use(express.json());
const PORT = 3000;

const generateID = () => {
  const subset = "123456789qwertyuiopasdfghjklzxcvbnm";
  const length = 5;
  let id = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * subset.length);
    id += subset[randomIndex];
  }
  return id;
};

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;
  if (!repoUrl) {
    return res.status(400).json({ error: "Missing URL" });
  }
  const id = generateID();
  const outputPath = path.join("output", id);
  await simpleGit().clone(repoUrl, outputPath);
  const files = getAllFiles(outputPath);
  console.log(files);
  res.json({ id: id });
});

app.listen(PORT, () => {
  console.log(`Upload Service Running, ${PORT}`);
});
