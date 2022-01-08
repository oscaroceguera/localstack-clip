const fs = require("fs");
const path = require("path");
const uploadFile = require("./aws");

const testUpload = () => {
  const filePath = path.resolve(__dirname, "test-image.jpeg");
  console.log("filePath", filePath);
  const fileStream = fs.createReadStream(filePath);
  console.log("fileStream", fileStream);
  const now = new Date();
  const fileName = `test-image-${now.toISOString()}.jpeg`;
  uploadFile(fileStream, fileName)
    .then((response) => {
      console.log(":)");
      console.log(response);
    })
    .catch((err) => {
      console.log(":|");
      console.log(err);
    });
};

testUpload();
