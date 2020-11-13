const request = require("request-promise-native");
const { crawlTypes } = require("../../constants");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const querystring = require("querystring");
const proxyUtils = require("../proxy-utils");
const config = require("../../../config");
const detailCrawler = require("./detail");
const offerListCrawler = require("./offer-listing");
const url = require("url");

// DEBUG
const fs = require("fs");

const PRICE_TIMEOUT = 15000;
const PROPS_TIMEOUT = 20000;
const URL_TIMEOUT = 20000;
const DESC_TIMEOUT = 60000;
const SHIPPING_TIMEOUT = 25000;
const CRAWLER_ID = "AMAZON";


const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => {
  // No-op to skip console errors.
});

// TODO: remove timeouts when program is finished and somehow finish halted requests

// dom  check page type
function getPageType(dom) {
  const elem_title = dom.window.document.querySelector("#olpProduct");

  if (elem_title === null) {
    return crawlTypes.Detail;
  }

  return crawlTypes.OfferList;
}

// return all item offers as a JSDOM object
// async function getOffersPage(asin, qsObj = {}, timeout = 60000) {
//   return new Promise(async (resolve, reject) => {
//     // timeout
//     setTimeout(() => {
//       resolve(false);
//     }, timeout);
//
//     let dom;
//
//     const qs = querystring.stringify(qsObj);
//
//     try {
//       const htmlString = await request({
//         url: `https://www.amazon.com/gp/offer-listing/${asin}?${qs}`,
//         proxy: proxyUtils.getProxy(CRAWLER_ID),
//         gzip: true,
//         headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
//       });
//
//       // DEBUG
//       fs.writeFileSync('offers-page.html', htmlString);
//       dom = new JSDOM(htmlString, { virtualConsole });
//     } catch (err) {
//       return resolve(false);
//     }
//
//     resolve(dom);
//   });
// }

// return main info about category:
// prices, properties, name, image
async function getCategoryMain(asin) {
  try {
    const offersDOM = await offerListCrawler.getOffersPage(asin);

    if (offersDOM === false) {
      return false;
    }

    // check page type(offer-list or detail)
    const pageType = getPageType(offersDOM);
    if (pageType == crawlTypes.Detail) {

      // parse detail page
      const result = await detailCrawler.parseDetailPage(asin);

      return result;
    }
    else if (pageType == crawlTypes.OfferList) {
      // parse offer-listing page
      const res = await offerListCrawler.parseOfferListPage(asin);

      return res;
    }
    else {
      return false;
    }
  } catch (err) {
    return false;
  }
}

function getCategoryDescription(asin) {
  return new Promise(async (resolve, reject) => {
    // timeout
    setTimeout(() => {
      resolve(false);
    }, DESC_TIMEOUT);

    let dom;

    try {
      const htmlString = await request({
        url: `https://www.amazon.com/dp/${asin}`,
        proxy: await proxyUtils.getProxy(CRAWLER_ID),
        gzip: true,
        headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
      });

      dom = new JSDOM(htmlString, { virtualConsole });
    } catch (err) {
      return resolve(false);
    }

    // extract description bullets
    let descriptionBullets = [];
    const elem_bulletsList = dom.window.document.querySelector(
      "#feature-bullets .a-unordered-list"
    );

    if (elem_bulletsList !== null) {
      for (const elem_bullet of elem_bulletsList.children) {
        // elem hidden
        if (elem_bullet.classList.contains("aok-hidden") === true) {
          continue;
        }

        const elem_bulletValue = elem_bullet.querySelector(".a-list-item");

        if (elem_bulletValue === null) {
          continue;
        }

        const bulletText = elem_bulletValue.textContent.trim();

        if (bulletText.length === 0) {
          continue;
        }

        descriptionBullets.push(bulletText);
      }
    }

    // extract and preprocess description
    let descriptionText;

    const elems_descriptionParagraphs = dom.window.document.querySelectorAll(
      "#productDescription > p"
    );

    for (const elem_paragraph of elems_descriptionParagraphs) {
      if (elem_paragraph.childNodes.length === 0) {
        continue;
      }

      // extract just first text node from each paragraph
      // there could be another tech specs tho
      if (
        elem_paragraph.childNodes[0].nodeType !== dom.window.document.TEXT_NODE
      ) {
        continue;
      }

      const text = elem_paragraph.childNodes[0].nodeValue.trim();

      if (text.length === 0) {
        continue;
      }

      // add new line
      if (descriptionText !== void 0) {
        descriptionText += "\n";
      } else {
        descriptionText = "";
      }

      descriptionText += text;
    }

    resolve({
      descriptionBullets,
      descriptionText
    });
  });
}

function getCategoryShipping(asin) {
  return new Promise(async (resolve, reject) => {
    // timeout
    setTimeout(() => {
      resolve(false);
    }, SHIPPING_TIMEOUT * (config.app.shippingInfoCountries.length + 1));

    const cookiejar = request.jar();

    // initial request, create amazon session
    try {
      const htmlString = await request({
        url: `https://www.amazon.com/dp/${asin}?psc=1`,
        proxy: await proxyUtils.getProxy(CRAWLER_ID),
        gzip: true,
        jar: cookiejar,
        headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
      });
    } catch (err) {
      return resolve(false);
    }

    const shippingInfo = new Map();

    for (const country of config.app.shippingInfoCountries) {
      try {
        const response = await request({
          url: "https://www.amazon.com/gp/delivery/ajax/address-change.html",
          proxy: await proxyUtils.getProxy(CRAWLER_ID),
          headers: proxyUtils.getProxyHeaders(CRAWLER_ID),
          gzip: true,
          json: true,
          method: "POST",
          formData: {
            locationType: "COUNTRY",
            district: country,
            countryCode: country,
            deviceType: "web",
            pageType: "Detail",
            actionSource: "glow"
          },
          jar: cookiejar
        });
      } catch (error) {
        continue;
      }

      let dom;

      try {
        const htmlString = await request({
          url: `https://www.amazon.com/dp/${asin}?psc=1`,
          proxy: await proxyUtils.getProxy(CRAWLER_ID),
          gzip: true,
          jar: cookiejar,
          headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
        });

        dom = new JSDOM(htmlString, { virtualConsole });
      } catch (err) {
        continue;
      }

      const elem_shippingMessage = dom.window.document.querySelector(
        "#shippingMessageInsideBuyBox_feature_div .a-size-base"
      );

      if (elem_shippingMessage === null) {
        shippingInfo.set(country, {
          canDeliver: false
        });
      } else {
        // parse price
        let price;
        const priceMsg = elem_shippingMessage.textContent.trim();

        // delivery is free
        if (priceMsg.includes("FREE") === true) {
          price = 0;
        }

        // trying to parse number out of price message
        const regexResult = /\$([\d\.]+)/.exec(priceMsg);

        if (regexResult !== null) {
          const num = parseFloat(regexResult[1]);

          if (Number.isNaN(num) === false) {
            price = num;
          }
        }

        // add
        shippingInfo.set(country, {
          canDeliver: true,
          estimatedShippingPrice: price
        });
      }
    }

    resolve(shippingInfo);
  });
}

module.exports = {
  getCategoryMain,
  getCategoryShipping,
  getCategoryDescription,
};
