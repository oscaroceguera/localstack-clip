const app = require("./app");
const PORT = 3000;

app.use((req, res) => {
  res.status(404);
  res.send({ error: "Not Found -  Error 404." });
});

app.listen(PORT, () =>
  console.log(`Server listening @ http://localhost:${PORT}`)
);
