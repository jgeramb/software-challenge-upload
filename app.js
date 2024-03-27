const env = require("dotenv").config().parsed;
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const softwareChallenge = require("./software_challenge");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/v1/upload/:name", bodyParser.raw({ type: "application/octet-stream", limit: "16mb" }), (request, response) => {
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

  const fileName = request.query.fileName;

  if (!fileName) {
    return response.status(400).json({
      message: "No file name provided"
    });
  }

  const parameters = request.query.params || "";

  if (!request.body) {
    return response.status(400).json({
      message: "No file uploaded"
    });
  }

  softwareChallenge.uploadClient(request.params.name, parameters, fileName, request.body)
      .then(() => console.log(`Client '${request.params.name}' uploaded successfully`));

  return response.status(200).json({
    message: "ok"
  });
});

const port = env.HTTP_PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
