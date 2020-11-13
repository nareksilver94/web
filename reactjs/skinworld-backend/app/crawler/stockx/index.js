const request = require("request-promise");
const { utils } = require("../../helpers");
const proxyUtils = require("../proxy-utils");

const PRODUCT_TIMEOUT = 20000;
const CRAWLER_ID = "STOCKX";

async function getProductData(productSlug) {
  return Promise.race([
    utils.asyncWait(PRODUCT_TIMEOUT).then(() => {
      return false;
    }),
    request({
      url: `https://stockx.com/api/products/${productSlug}?includes=market,360&currency=USD&country=NO`,
      proxy: await proxyUtils.getProxy(CRAWLER_ID),
      json: true,
      headers: {
        ...proxyUtils.getProxyHeaders(CRAWLER_ID),
        Referer: `https://stockx.com/${productSlug}`,
      },
      gzip: true
    })
      .then(resp => {
        return resp.Product;
      })
      .catch(err => {
        return false;
      })
  ]);
}

async function getEstimatedShippingPrice(sku, price) {
  return Promise.race([
    utils.asyncWait(PRODUCT_TIMEOUT).then(() => {
      return false;
    }),
    request({
      url: `https://stockx.com/api/pricing?currency=USD&country=NO`,
      proxy: await proxyUtils.getProxy(CRAWLER_ID),
      json: true,
      method: "POST",
      body: {
        context: "buying",
        products: [
          {
            sku: sku,
            amount: price,
            quantity: 1
          }
        ],
        discountCodes: [""]
      },
      gzip: true,
      headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
    })
      .then(resp => {
        for (const adj of resp.adjustments) {
          if (adj.text === "Estimated Shipping") {
            return adj.amount;
          }
        }

        return false;
      })
      .catch(err => {
        return false;
      })
  ]);
}

module.exports = {
  getProductData,
  getEstimatedShippingPrice
};
