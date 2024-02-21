const env = require("dotenv").config().parsed;
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const softwareChallenge = require("./software_challenge");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/v1/upload/:name", bodyParser.raw({ type: "application/octet-stream", limit: "16mb" }), async (request, response) => {
  if (!request.headers["x-api-key"]) {
    return response.status(401).json({
      message: "Unauthorized"
    });
  }

  if (request.headers["x-api-key"] !== `${env.API_KEY}`) {
    return response.status(403).json({
      message: "Forbidden"
    });
  }

  if (!request.params.name) {
    return response.status(400).json({
      message: "No name provided"
    });
  }

  if (!request.body) {
    return response.status(400).json({
      message: "No file uploaded"
    });
  }

  await softwareChallenge.uploadClient(request.params.name, request.body);

  return response.status(200).json({
    message: "ok"
  });
});

const port = env.HTTP_PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
