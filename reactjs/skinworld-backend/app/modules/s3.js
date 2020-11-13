const AWS = require("aws-sdk");
const config = require("../../config");

const getFolderInfo = async folderName => {
  const s3 = getValidS3();
  let allKeys = [];

  const listAllKeys = token =>
    new Promise((resolve, reject) => {
      let opts = {
        Bucket: config.app.s3Bucket,
        Prefix: folderName
      };
      if (token) {
        opts.ContinuationToken = token;
      }

      s3.listObjectsV2(opts, (err, data) => {
        if (err) {
          return reject(err);
        }
        allKeys = allKeys.concat(data.Contents);

        if (data.IsTruncated) {
          listAllKeys(data.NextContinuationToken, resolve);
        } else {
          resolve();
        }
      });
    });

  await listAllKeys();

  return allKeys;
};

const uploadFile = async (buf, contentType, path) => {
  try {
    const s3 = getValidS3();
    const params = {
      Bucket: config.app.s3Bucket,
      Key: path,
      Body: buf,
      ACL: "public-read",
      ContentType: contentType
    };
    await s3.upload(params).promise();
    const uploadedFilePath = `https://s3.${config.app.awsRegion}.amazonaws.com/${config.app.s3Bucket}/${path}`;

    return uploadedFilePath;
  } catch (err) {
    throw err;
  }
};

const deleteFile = (path) => {
  return new Promise((resolve, reject) => {
    try {
      const s3 = getValidS3();
      const params = {
        Bucket: config.app.s3Bucket,
        Key: path
      };
      s3.deleteObject(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);          
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

function getValidS3() {
  const aws_config = new AWS.Config({
    accessKeyId: config.app.awsAccessKey,
    secretAccessKey: config.app.awsSecretAccessKey,
    region: config.app.awsRegion
  });

  return new AWS.S3(aws_config);
}

module.exports = {
  getFolderInfo,
  uploadFile,
  deleteFile
};
