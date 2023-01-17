const fs = require("fs");
const AWS = require("aws-sdk");
const { s3Config } = require("./secret");

const s3 = new AWS.S3({
  accessKeyId: s3Config.accessKey,
  secretAccessKey: s3Config.secretKey,
  region: s3Config.region,
});

async function uploadFileToS3(fileName) {
  const data = fs.readFileSync(fileName).toString();
  const params = {
    Bucket: s3Config.bucket,
    Key: "info.json",
    ACL: "public-read",
    Body: data,
  };

  await s3
    .deleteObject({
      Bucket: params.Bucket,
      Key: params.Key,
    })
    .promise();

  await s3.putObject(params).promise();
}

module.exports = { uploadFileToS3 };
