const { crawlTypes } = require("../../constants");
const request = require("request-promise-native");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const querystring = require("querystring");
const proxyUtils = require("../proxy-utils");
const config = require("../../../config");
const url = require("url");
// DEBUG
const fs = require("fs");

const CRAWLER_ID = "AMAZON";

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => {
  // No-op to skip console errors.
});

// dom  JSDOM of single item
function parseTitle(dom) {
  const elem_title = dom.window.document.querySelector("#productTitle");

  if (elem_title === null) {
    return false;
  }

  return elem_title.textContent.trim();
}

// dom  JSDOM of single item
function parsePrice(dom) {

  let price;
  let parsedPriceSub;
  let elem_priceValue = dom.window.document.querySelector(".price-large");
  let sub_elem_priceValue = dom.window.document.querySelectorAll(".price-info-superscript");

  let parsedPriceCurr = sub_elem_priceValue[0].textContent.trim();

  if (elem_priceValue !== null) {

    if (parsedPriceCurr !== "$") {
      return;
    }

    try {
      parsedPriceSub = sub_elem_priceValue[1].textContent.trim();
    } catch (err) {
      parsedPriceCurr = null
    }
    let parsedPrice = elem_priceValue.textContent.trim();

    if (parsedPriceSub !== null) {
      parsedPrice = parsedPrice+'.'+parsedPriceSub
    }

    parsedPrice = parsedPrice.replace(",", "");

    if (Number.isNaN(parsedPrice) === false) {
      // modify 10% up
      price = parsedPrice * 1.1;
    }
  }

  return price;
}

// dom  JSDOM of single item
function parseImage(dom) {

  const img = dom.window.document.querySelector('.imgTagWrapper img');

  if (img === null) {
    return false;
  }

  return img.getAttribute('data-old-hires');
}

// return single item page as a JSDOM object
async function getItemPage(asin, timeout = 60000) {
  return new Promise(async (resolve, reject) => {
    // timeout
    setTimeout(() => {
      resolve(false);
    }, timeout);

    let dom;

    try {
      const htmlString = await request({
        url: `https://www.amazon.com/dp/${asin}?psc=1`,
        proxy: await proxyUtils.getProxy(CRAWLER_ID),
        gzip: true,
        headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
      });

      dom = new JSDOM(htmlString, { virtualConsole });
    } catch (err) {
      return resolve(false);
    }

    resolve(dom);
  });
}

// return detail page item as a JSDOM object
async function parseDetailPage(asin) {

  const detailsDOM = await getItemPage(asin);

  const title = parseTitle(detailsDOM);

  const price = parsePrice(detailsDOM);

  const image = parseImage(detailsDOM);

  return {
    image,
    img: image,
    title,
    name: title,
    price,
    variants: [],
    itemType: crawlTypes.Detail,
  };  
}

module.exports = {
  parseDetailPage
};
