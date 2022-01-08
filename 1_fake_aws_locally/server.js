const express = require("express");
const app = express();
const fileUpload = require("express-fileupload");
const uploadFile = require("./aws");

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

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
