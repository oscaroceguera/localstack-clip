const express = require("express");
const app = express();
const fileUpload = require("express-fileupload");
const { uploadFile, getFiles } = require("./aws");

const PORT = 5000;

app.use(fileUpload());

app.post("/", (req, res) => {
  const file = req.files.image.data;
  const now = new Date();
  const fileName = `${now.toISOString()}-${req.files.image.name}`;

  uploadFile(file, fileName)
    .then((response) => {
      console.log(response);
      res.send(response);
    })
    .catch((err) => {
      console.log(err);
      res.send(err);
    });
});

app.get("/", (req, res) => {
  getFiles()
    .then((response) => {
      console.log("objects:", response);
      // Key:  "http://localhost:4566/demo-bucket/demo-bucket/2022-01-10T20%3A38%3A50.254Z-Asuetos%202021.PNG"

      const files = response.Contents.map((file) => {
        console.log("file inside", file);
        return {
          Key: file.Key,
          Source: `http://localhost:4566/demo-bucket/${file.Key}`,
          LastModified: file.LastModified,
          ETag: file.ETag,
          Size: file.Size,
          StorageClass: file.StorageClass,
          Owner: {
            DisplayName: file.Owner.DisplayName,
            ID: file.Owner.ID,
          },
          // Key: "demo-bucket/2022-01-08T09:17:09.121Z-coca-cola.png",
          // LastModified: "2022-01-10T20:28:41.282Z",
          // ETag: '"87c9df7b9fee2c266b82e81403cd9d68"',
          // Size: 4347,
          // StorageClass: "STANDARD",
          // Owner: {
          //   DisplayName: "webfile",
          //   ID: "75aa57f09aa0c8caeab4f8c24e99d10f8e7faeebf76c078efc7c6caea54ba06a",
          // },
        };
      });

      console.log("files", files);

      res.send(files);
    })
    .catch((err) => {
      console.log("ERROR  images", err);
      res.send(err);
    });
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
