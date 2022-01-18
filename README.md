# Localstack practices

Localstack reference:

https://localstack.cloud

Benefits:

- You can work offline
- You don't need a shared 'dev' bucket that everyone on your team uses
- You can easily wipe & replace your local buckets
- You don't need to worry about paying for AWS usage
- You don't need to log into AWS 😛

Stack:

- Nodejs
- Express
- [brew if is necesary](https://brew.sh/)
- Localstack (AWS suit)
- Docker & Docker Compose
- Jest & SuperTest for testing
- Swagger for documentation

---

## First Goal (Fake AWS locally with LocalStack)

[Reference](https://dev.to/goodidea/how-to-fake-aws-locally-with-localstack-27me)

**Localstack within a node app**

Localstack allows you to emulate a number of AWS services on your computer. We are going to use a S3 iin this example.

**Initial setup**

1. Install [docker](https://docs.docker.com/get-docker) if you haven't already.
2. Install **AWS CLI** [oficial](https://aws.amazon.com/es/cli/) or [using brew](https://formulae.brew.sh/formula/awscli), even though we aren't going to be working with "real" AWS, we'll use this to talk to our local docker containers.
3. Once the AWS CLI is installed, run `aws configure` to create some credentials. Even though we're talking to our "fake" local service, we still need credentials. You can enter real credentials (as described [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)), or dummy ones. Localstack requires that these details are present, but doesn't actually validate them.
4. Create a new directory for you project, and within it a new nodejs project `npm init -y`.
5. Make a few files inside you project:

- aws.js
- docker-compose.yml
- test-upload.js
- .env

6. Add an image to your project directory and rename it to `test-upload.jpg`.
7. Install aws-sdk, dotenv `npm install --save aws-sdk dotenv`

**Docker config**

Run Localstack with docker-compose to set this up.

`docker-compose.yml`

```yml
version: "3.2"
services:
  localstack:
    image: localstack/localstack:0.11.3
    container_name: "fake-aws-s3"
    network_mode: bridge
    ports:
      - "4566:4566"
      - "8055:8080"
    environment:
      - SERVICES=s3
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - "./.localstack:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

The line `4566:4566` does the same thing, but binds a whole range of ports. These particular port numbers are what Localstack uses as endpoints for the various APIs. We'll see more about this in a little bit.

`SERVICES=s3`: You can define a list of AWS services to emulate. In our case, we're just using S3, but you can include additional APIs, i.e.

`SERVICES=s3,lambda`: There's more on this in the Localstack docs.

`DEBUG=1`: 🧻 Show me all of the logs!

`DATA_DIR=/tmp/localstack/data`: This is the directory where Localstack will save its data internally.

**Starting our container**

Run in terminal:

`docker-compose up`

To make sure it's working, we can visit http://localhost:8055 to see localstack's web UI:

![first](images/fake_aws_s3_01.png)

Similary, our s3 endpoint http://localhost:4566:

![second](images/fake_aws_s3_02.png)

**Working with Localstack**

AWS is now inside our computer. After we start upload files, we need to create and configure a **bucket**. We will do this using rhw AWS CLI that we installed earlier, using the `-- endpoint-url` flag to talk to Localstack instead.

1. Create a bucket: `aws --endpoint-url=http://localhost:4566 s3 mb s3://demo-bucket`
2. Attach an [ACL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html) (Access control list) to the bucket so it's readable: `aws --endpoint-url=http://localhost:4566 s3api put-bucket-acl --bucket demo-bucket --acl public-read`

Now, when we visit the web UI, we will see our bucket:
![thrid](images/fake_aws_s3_03.png)

If you use `volumes` in your docker settings, let's paause for a moment to look at what's going on in `./.localstack/data`:

![four](images/fake_aws_s3_04.png)

Here, we can see that Localstack is recording all API calls in this JSON file. When the container restarts, it will re-apply these calls - this is how we are able to keep our data between restarts. Once we start uploading, we won't see new files appear in this directory. Instead, our uploads will be recorded in this file as raw data. (You could include this file in your repo if you wanted to share the state of the container with others - but depending on how much you upload, it's going to become a pretty big file)

**Uploading from our app**

We will just make a simple **upload** function and try uploading an image a few times to our S3 butcket.

`.env`, our enviroment variables

```
AWS_ACCESS_KEY_ID='123'
AWS_SECRET_KEY='xyz'
AWS_BUCKET_NAME='demo-bucket'
```

_Note: it doesn't matter what your AWS key & secret are, as long as they aren't empty._

`aws.js`, the module for our upload function

```js
const AWS = require("aws-sdk");
require("dotenv").config();

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
};

const useLocal = process.env.NODE_ENV !== "production";

const bucketName = process.env.AWS_BUCKET_NAME;

const s3client = new AWS.S3({
  credentials,
  endpoint: useLocal ? "http://localhost:4566" : undefined,
  s3ForcePathStyle: true,
});

const uploadFile = async (data, name) =>
  new Promise((resolve) => {
    s3client.upload(
      {
        Bucket: bucketName,
        Key: `${bucketName}/${name}`,
        Body: data,
      },
      (err, response) => {
        if (err) throw err;
        resolve(response);
      }
    );
  });

module.exports = uploadFile;
```

`test-upload.js`, which implements th eupload function

```js
const fs = require("fs");
const path = require("path");
const uploadFile = require("./aws");

const testUpload = () => {
  const filePath = path.resolve(__dirname, "test-image.jpg");
  const fileStream = fs.createReadStream(filePath);
  const now = new Date();
  const fileName = `test-image-${now.toISOString()}.jpg`;
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
```

Run `node test-upload.js` in your terminal

![five](images/fake_aws_s3_05.png)

Copy the URL in the Location property of the response and paste it into your browser. The browser will immediately download the image. If you want to see it in your browser, you can use something like JS Bin:

![six](images/fake_aws_s3_06.png)

Then, if you look at .localstack/data/recorded_api_calls.json again, you'll see it filled up with the binary data of the image:

![seven](images/fake_aws_s3_07.png)

**EXERCISE**

Add a Endpoint to upload files (images) and other that list all images, install:

- express
- express-fileupload

![eight](images/fake_aws_s3_08.png)

---

## Second Goal (Localstack/Nodejs/DynamoDB/Swagger/Jest)

- Create a new directory for you project
- Within it a new nodejs project `npm init -y`.
- install dependecies with npm:
  - `npm install --save aws-sdk body-parser cors express swagger-ui-express xid-js`
  - `npm install --save-dev jest nodemon supertest`
- Create new files:
  - src/index.js
  - src/app.js
  - src/router.js
  - src/tests/integration.test.js
  - src/swagger.json
  - Dockerfile
  - docker-compose.yml
  - jest.config.js

**Setup routes `src/routes`**

```javascript
const express = require("express");
const router = express.Router();

module.exports = router;
```

**Begin a simple express server `src/app.js`**

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const router = require("./router");
const swaggerUI = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const app = express();

app.use(cors());

app.get("/", (req, res) => {
  const msg = {
    message: "Welcome to API!",
  };

  res.status(200).send(msg);
});

app.get("/status", (req, res) => {
  const status = {
    status: "ok",
    api: "soccer-player-api",
    time: Date.now(),
  };
  res.status(200).send(status);
});

router.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});

app.use("/", router);

module.exports = app;
```

**Write document `src/swagger.json`**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Soccer Players API",
    "description": "Tiny RESTful API using Node.js: allows you to manage soccer players.",
    "contact": {
      "name": "Mauro Bonfietti",
      "url": "https://github.com/maurobonfietti"
    },
    "version": "1.0"
  },
  "paths": {
    "/": {
      "get": {
        "tags": ["Info"],
        "summary": "Get help",
        "description": "Get help about this API.",
        "operationId": "Gethelp",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "headers": {
              "X-Powered-By": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "Express"
                  }
                }
              },
              "Access-Control-Allow-Origin": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "*"
                  }
                }
              },
              "Content-Length": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "43"
                  }
                }
              },
              "ETag": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "W/\"2b-h6BMmxGhWkCo5dA5bJgq/pDo3sQ\""
                  }
                }
              },
              "Date": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "Mon, 23 Dec 2019 21:03:20 GMT"
                  }
                }
              },
              "Connection": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "keep-alive"
                  }
                }
              }
            },
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "$ref": "#/components/schemas/Gethelp"
                },
                "example": {
                  "message": "Welcome to Soccer Player API!"
                }
              }
            }
          }
        },
        "deprecated": false
      }
    },
    "/status": {
      "get": {
        "tags": ["Info"],
        "summary": "Health check",
        "description": "Get status of this API.",
        "operationId": "Healthcheck",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "headers": {
              "X-Powered-By": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "Express"
                  }
                }
              },
              "Access-Control-Allow-Origin": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "*"
                  }
                }
              },
              "Content-Length": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "62"
                  }
                }
              },
              "ETag": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "W/\"3e-r8UILbmoe9Rk/g5iPSk00uuUUuk\""
                  }
                }
              },
              "Date": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "Mon, 23 Dec 2019 21:03:27 GMT"
                  }
                }
              },
              "Connection": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string"
                    },
                    "example": "keep-alive"
                  }
                }
              }
            },
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "$ref": "#/components/schemas/Healthcheck"
                },
                "example": {
                  "status": "ok",
                  "api": "soccer-player-api",
                  "time": 1577135007891
                }
              }
            }
          }
        },
        "deprecated": false
      }
    }
  },
  "components": {
    "schemas": {
      "Gethelp": {
        "title": "Gethelp",
        "required": ["message"],
        "type": "object",
        "properties": {
          "message": {
            "type": "string"
          }
        },
        "example": {
          "message": "Welcome to Soccer Player API!"
        }
      },
      "Healthcheck": {
        "title": "Healthcheck",
        "required": ["status", "api", "time"],
        "type": "object",
        "properties": {
          "status": {
            "type": "string"
          },
          "api": {
            "type": "string"
          },
          "time": {
            "type": "integer",
            "format": "int64"
          }
        },
        "example": {
          "status": "ok",
          "api": "soccer-player-api",
          "time": 1577135007891
        }
      }
    }
  },
  "tags": [
    {
      "name": "Info",
      "description": "Endpoints to get info about the API."
    },
    {
      "name": "Players",
      "description": "Endpoints to get and manage soccer players."
    }
  ]
}
```

**Listening the server `src/index.js`**

```javascript
const app = require("./app");
const PORT = 3000;

app.use((req, res) => {
  res.status(404);
  res.send({ error: "Not Found -  Error 404." });
});

app.listen(PORT, () =>
  console.log(`Server listening @ http://localhost:${PORT}`)
);
```

**Modify the package.json script section**

```json
...
"scripts": {
        "start": "node src/index.js",
        "local": "nodemon --inspect=0.0.0.0:9229 src/index.js",
        "test": "jest --coverage"
    },
...
```

**Start the server with `npm start`**

![dynamo01](images/node_dynamodb_01.png)

**Consult documentation `http://localhost:3000/docs`**

![dynamo03](images/node_dynamodb_03.png)

**Write some simple tests `src/tests/integration.test.js`**

```javascript
const request = require("supertest");
const app = require("../app");

describe("Integration Test for the API", () => {
  describe("GET /", () => {
    it("should response 200", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /status", () => {
    it("should response 200", async () => {
      const res = await request(app).get("/status");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("status", "api", "time");
    });
  });
});
```

**Run `npm test`**
![dynamo02](images/node_dynamodb_02.png)
