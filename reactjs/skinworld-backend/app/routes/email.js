const router = require('express').Router();
const { processWebhook } = require('../modules/email.js');
const { utils, errorMaker } = require('../helpers');

router.post("/process-webhook", async (req, res, next) => {
  // IPN couldn't be verified, need to be careful about incoming data
  if (req.body instanceof Array === false) {
    return utils.sendResponse(res, new Error('IPN body should be Array'));
  }

  try {
    const result = await processWebhook(req.body);
    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

module.exports = router;
