const request = require("request-promise-native");
const fs = require("fs");

class UrlDataPipe {
  async getData(url) {
    return new Promise(async (resolve, reject) => {
      try {      
        const srcData = await request({
          url,
          method: "GET",
          encoding: null
        });
        const originalFileName = `/tmp/temp_original_${Date.now()}`;
        fs.writeFileSync(originalFileName, srcData);
        resolve(originalFileName);
      } catch (err1) {
        reject(err1);
      }
    });
  }  
};

class FileDataPipe {
  async getData(file) {
    return new Promise((resolve, reject) => {
      resolve(file);
    });
  }
};

module.exports = {
  UrlDataPipe,
  FileDataPipe
};
