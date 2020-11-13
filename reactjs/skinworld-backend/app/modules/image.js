const request = require("request-promise-native");
const im = require("imagemagick");
const fs = require("fs");
const s3 = require("./s3");
const { uploadImageTypes } = require("../constants");

let dataPipe = null;

const removeBackgroundAndUpload = async (file, dimension = 240, subFolderName = uploadImageTypes.ItemImage, fileName = '') => {
  if (!dataPipe) {
    return { success: false, message: 'DataPipe is not defined.' };
  }

  const originalFileName = await dataPipe.getData(file);
  const destFileName = `/tmp/temp_dest_${Date.now()}.png`;

  let folderName = 'images/' + subFolderName;
  const isThumbnail = dimension < 240;
  if (isThumbnail) {
    folderName = 'thumbnails/' + subFolderName;
  }

  let filePath = `${folderName}/${(fileName) ? fileName : "file_" + Date.now()}`;
  return await convertAndUploadImageToS3(originalFileName, destFileName, filePath, dimension);    
};

const setDataPipe = (pipe) => {
  dataPipe = pipe;
};

const convertAndUploadImageToS3 = (originalFileName, destFileName, filePath, dimension) => {
  return new Promise((resolve, reject) => {
    im.convert(
      [
        originalFileName,
        "-fuzz",
        "3%",
        "-trim",
        "+repage",
        "-transparent",
        "white",
        "-resize",
        `${dimension}x${dimension}`,
        destFileName
      ],
      async (err, stdout) => {
        if (err) {
          return reject(err);
        }
        try {
          const data = fs.readFileSync(destFileName);
          const resultUrl = await s3.uploadFile(
            data,
            "image/png",
            filePath
          );
          resolve(resultUrl);
        } catch (err1) {
          reject(err1);
        }
      }
    );
  });
};

const imageManualUpload = async (file, isThumbnail = false, subFolderName = uploadImageTypes.ItemImage, fileName = '') => {
  if (!dataPipe) {
    return { success: false, message: 'DataPipe is not defined.' };
  }

  const originalFileName = await dataPipe.getData(file);

  let folderName = 'images/' + subFolderName;
  if (isThumbnail) {
    folderName = 'thumbnails/' + subFolderName;
  }

  let filePath = `${folderName}/${(fileName) ? fileName : "file_" + Date.now()}`;
  return await uploadImageToS3(originalFileName, filePath);    
};

const uploadImageToS3 = (fileName, destFilePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = fs.readFileSync(fileName);
      const resultUrl = await s3.uploadFile(
        data,
        "image/png",
        destFilePath
      );
      resolve(resultUrl);
    } catch (err) {
      reject(err);
    }
  });
};

const deleteS3Image = async (imageUrl) => {
  if (imageUrl) {
    return await s3.deleteFile(imageUrl.split('/').slice(-3).join('/'));
  }
  return false;
};

module.exports = {
  removeBackgroundAndUpload,
  imageManualUpload,
  deleteS3Image,
  setDataPipe
};
