const request = require("request-promise-native");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const querystring = require("querystring");
const proxyUtils = require("../proxy-utils");
const config = require("../../../config");
const url = require("url");

// DEBUG
const fs = require("fs");

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => {
  // No-op to skip console errors.
});

const LOWEST_OFFER_EACH = "Lowest offer for each";
const CRAWLER_ID = "AMAZON";

const PRIORITY_PROPS = {
  color_name: 1
  // 'special_size_type': 1,
};

function isImageUnavailable(imgLink) {
  return imgLink.endsWith(".gif");
}

function getHQImage(imgLink) {
  const regexResult = /.+SS(\d+)_\.jpg/.exec(imgLink);

  if (regexResult === null) {
    return false;
  }

  return imgLink.replace(regexResult[1], "690");
}

// dom  JSDOM of offers-list page
function parseProperties(dom) {
  // extract properties
  const properties = [];
  const currentQs = {};
  const currentProperties = {};
  const elems_propsTitle = dom.window.document.querySelectorAll(".a-size-base");

  // parse option link
  const parseOptionLink = (link, qsName) => {
    let parsedUrl;

    try {
      parsedUrl = url.parse(link);
    } catch (error) {
      return false;
    }

    // trying to get querystring value
    const qs = querystring.parse(parsedUrl.query);
    const qsPropertyName = `mv_${qsName}`;

    const result = {};

    if (qs[qsPropertyName] !== void 0) {
      result.qsValue = qs[qsPropertyName];
    }

    // trying to get asin
    const regexResult = /[a-z0-9]{10}/i.exec(parsedUrl.pathname);

    if (regexResult !== null) {
      result.asin = regexResult[0];
    }

    return result;
  };

  // trying to find property querystring name
  // in "mv_size_name" - size_name is qs name
  const getQsName = elem_container => {
    const optionsLinks = [];

    // get all options links
    if (elem_container.classList.contains("a-unordered-list")) {
      for (const elem_option of elem_container.children) {
        const elem_link = elem_option.querySelector("a");

        if (elem_link !== null) {
          optionsLinks.push(elem_link.href);
        }
      }
    } else if (elem_container.classList.contains("a-dropdown-container")) {
      for (const elem_option of elem_container.firstElementChild.children) {
        const elem_link = elem_option.querySelector("a");
        optionsLinks.push(elem_option.value);
      }
    }

    // parse them and find mv_* value that changes most of the time
    const changesCounter = {};
    const prevValues = {};

    for (const link of optionsLinks) {
      let parsedUrl;

      try {
        parsedUrl = url.parse(link);
      } catch (error) {
        return false;
      }

      const qs = querystring.parse(parsedUrl.query);

      for (const [qsName, qsValue] of Object.entries(qs)) {
        if (qsName.startsWith("mv_") === false) {
          continue;
        }

        if (prevValues[qsName] !== void 0 && prevValues[qsName] !== qsValue) {
          if (changesCounter[qsName] === void 0) {
            changesCounter[qsName] = 2;
          } else {
            changesCounter[qsName] += 1;
          }
        }

        prevValues[qsName] = qsValue;
      }
    }

    // find biggest changes value
    const biggestChanges = Object.entries(changesCounter).reduce(
      (accum, [key, value]) => {
        if (value > accum.value) {
          accum.key = key;
          accum.value = value;
        }

        return accum;
      },
      { key: void 0, value: 0 }
    );

    if (biggestChanges.key !== void 0) {
      return biggestChanges.key.slice(3);
    } else {
      return false;
    }
  };

  // extract property data
  for (const elem of elems_propsTitle) {
    let propTitle = elem.textContent.trim();

    if (propTitle[propTitle.length - 1] !== ":") {
      continue;
    }

    const elem_propValue = elem.nextElementSibling;
    let propValue;

    if (
      elem_propValue !== null &&
      elem_propValue.classList.contains("a-size-base") === true &&
      elem_propValue.classList.contains("a-text-bold") === true
    ) {
      propValue = elem_propValue.textContent.trim();

      if (propValue.length === 0) {
        propValue = void 0;
      }
    }

    propTitle = propTitle.slice(0, -1);

    const options = [];

    const prop = {
      title: propTitle,
      options
    };

    properties.push(prop);

    let elem_propOptions = elem.parentElement.nextElementSibling;

    // get querystring name
    const qsName = getQsName(elem_propOptions);

    prop.qsName = qsName;

    // extract property options
    if (elem_propOptions.classList.contains("a-unordered-list")) {
      // unordered list
      for (const elem of elem_propOptions.children) {
        if (elem.querySelector("img") !== null) {
          // button is image
          const elem_link = elem.querySelector("a");

          if (elem_link === null) {
            continue;
          }

          const optionLinkDetails = parseOptionLink(elem_link.href, qsName);

          if (optionLinkDetails.qsValue === false) {
            continue;
          }

          options.push({
            value: "<img>",
            qsValue: optionLinkDetails.qsValue,
            asin: optionLinkDetails.asin
          });

          // img is selected
          if (elem.querySelector(".a-button-selected") !== null) {
            currentQs[qsName] = optionLinkDetails.qsValue;
            currentProperties[qsName] = propValue || "<img>";
          }
        } else {
          // usual button
          const elem_button = elem.querySelector('[role="button"]');

          if (elem_button === null) {
            continue;
          }

          const elem_link = elem.querySelector("a");

          if (elem_link === null) {
            continue;
          }

          const optionLinkDetails = parseOptionLink(elem_link.href, qsName);

          if (optionLinkDetails.qsValue === false) {
            continue;
          }

          const propertyValue = elem_button.textContent.trim();

          // if (propertyValue === LOWEST_OFFER_EACH) {
          //   continue;
          // }

          options.push({
            value: propertyValue,
            qsValue: optionLinkDetails.qsValue,
            asin: optionLinkDetails.asin
          });

          // button is selected
          if (elem.querySelector(".a-button-selected") !== null) {
            currentQs[qsName] = optionLinkDetails.qsValue;
            currentProperties[qsName] = propValue || propertyValue;
          }
        }
      }
    } else if (elem_propOptions.classList.contains("a-dropdown-container")) {
      // dropdown container
      elem_propOptions = elem_propOptions.firstElementChild;

      for (const elem of elem_propOptions.children) {
        const propertyValue = elem.textContent.trim();

        // if (propertyValue === LOWEST_OFFER_EACH) {
        //   continue;
        // }

        const optionLinkDetails = parseOptionLink(elem.value, qsName);

        if (optionLinkDetails.qsValue === false) {
          continue;
        }

        options.push({
          value: propertyValue,
          qsValue: optionLinkDetails.qsValue,
          asin: optionLinkDetails.asin
        });

        // option is selected
        if (elem.selected === true) {
          currentQs[qsName] = optionLinkDetails.qsValue;
          currentProperties[qsName] = propValue || propertyValue;
        }
      }
    }
  }

  return {
    properties,
    currentQs,
    currentProperties
  };
}

// dom - offers JSDOM
function parseOffersTitle(dom) {
  const elem_title = dom.window.document.querySelector("#olpProductDetails h1");

  if (elem_title === null) {
    return false;
  }

  let title = elem_title.childNodes[
    elem_title.childNodes.length - 1
  ].textContent.trim();

  if (title.length === 0) {
    title = elem_title.textContent.trim();

    if (title.length === 0) {
      return false;
    }
  }

  return title;
}

// dom - offers JSDOM
function parseOffersImage(dom) {
  const elem_img = dom.window.document.querySelector("#olpProductImage img");

  if (elem_img === null) {
    return false;
  }

  // TODO: somehow check if "Image is unavailable" ?

  return elem_img.src;
}

// dom  JSDOM of offers-list
function parseOffersVariations(dom) {
  // extract variations
  const variations = [];

  dom.window.document
    .querySelectorAll(".olpOffer[role=row]")
    .forEach(elem_priceRow => {
      const properties = {};
      let image;

      let elem_variationRow = elem_priceRow.previousElementSibling;

      if (
        elem_variationRow !== null &&
        elem_variationRow.id == "variationRow"
      ) {
        // parse properties
        elem_variationRow
          .querySelectorAll(".a-list-item")
          .forEach(elem_prop => {
            // check if this image
            let elem_image = elem_prop.querySelector("img");

            if (elem_image !== null) {
              if (isImageUnavailable(elem_image.src) === false) {
                image = getHQImage(elem_image.src) || elem_image.src;
                return;
              }
            }

            let propName = elem_prop.childNodes[0].textContent.trim();

            // not a text prop
            if (propName.slice(-1) !== ":") {
              return;
            }

            propName = propName.slice(0, -1);

            let propValue = elem_prop.childNodes[1].textContent.trim();

            // const regexResult = /(\w+)\:\s+(.+)/.exec(elem_prop.textContent.trim());

            properties[propName] = propValue;
          });
      }

      // parse price
      let price;
      let elem_priceValue = elem_priceRow.querySelector(".olpOfferPrice");

      if (elem_priceValue !== null) {
        let parsedPrice = elem_priceValue.textContent.trim();

        if (parsedPrice[0] !== "$") {
          return;
        }

        parsedPrice = parsedPrice.replace(",", "");

        parsedPrice = parseFloat(parsedPrice.slice(1));

        if (Number.isNaN(parsedPrice) === false) {
          price = parsedPrice;
        }
      }

      if (price === void 0 && Object.keys(properties).length === 0) {
        return;
      } else {
        const variation = {
          price,
          properties
        };

        if (image !== void 0) {
          variation.image = image;
        }

        variations.push(variation);
      }
    });

  return variations;
}

// return all item offers as a JSDOM object
async function getOffersPage(asin, qsObj = {}, timeout = 60000) {
  return new Promise(async (resolve, reject) => {
    // timeout
    setTimeout(() => {
      resolve(false);
    }, timeout);

    let dom;

    const qs = querystring.stringify(qsObj);

    try {
      const htmlString = await request({
        url: `https://www.amazon.com/gp/offer-listing/${asin}?${qs}`,
        proxy: await proxyUtils.getProxy(CRAWLER_ID),
        gzip: true,
        headers: proxyUtils.getProxyHeaders(CRAWLER_ID)
      });

      dom = new JSDOM(htmlString, { virtualConsole });
    } catch (err) {
      console.error('Error while loading offers page', err);
      return resolve(false);
    }

    resolve(dom);
  });
}

// find offer-listing page by props
// neededProps: {
//  size_name: '!1', - everything except 1
//  color_name: '2', - exactly 2
//  }
async function findPageByProps(currentPage, neededProps, defaultAsin) {
  const neededPropsArr = [];
  for (const [qsName, qsValue] of Object.entries(neededProps)) {
    neededPropsArr.push({
      qsName,
      qsValue
    });
  }

  // sort according to priority(priority goes first)
  neededPropsArr.sort((a, b) => {
    const priorityA = PRIORITY_PROPS[a.qsName] || 0;
    const priorityB = PRIORITY_PROPS[b.qsName] || 0;

    return priorityB - priorityA;
  });

  const isPropsSame = (current, model) => {
    const propsNames = Object.keys(model);
    let isPropsSame = true;

    for (const qsName of propsNames) {
      let modelValue = model[qsName];

      // modificators
      if (modelValue[0] === "!") {
        modelValue = modelValue.slice(1);

        if (current[qsName] === modelValue) {
          isPropsSame = false;
          break;
        }
      } else {
        if (current[qsName] !== modelValue) {
          isPropsSame = false;
          break;
        }
      }
    }

    return isPropsSame;
  };

  let lastAsin = defaultAsin;

  for (const adjustingProp of neededPropsArr) {
    let adjustingPropValue = adjustingProp.qsValue;

    // modificators
    // const modificators = [];
    const antiModificator = adjustingPropValue[0] === "!";

    if (antiModificator === true) {
      adjustingPropValue = adjustingPropValue.slice(1);
    }

    const currentPageProps = parseProperties(currentPage);

    // check if we already here
    if (isPropsSame(currentPageProps.currentQs, neededProps) === true) {
      return {
        page: currentPage,
        asin: lastAsin
      };
    }

    // check if prop already okay
    if (
      antiModificator === true &&
      currentPageProps.currentQs[adjustingProp.qsName] !== adjustingPropValue
    ) {
      continue;
    }

    if (
      antiModificator === false &&
      currentPageProps.currentQs[adjustingProp.qsName] === adjustingPropValue
    ) {
      continue;
    }

    // adjust property
    // find that property on page
    propLoop: for (const prop of currentPageProps.properties) {
      if (prop.qsName === adjustingProp.qsName) {
        // go through prop options and find approp asin
        for (const option of prop.options) {
          if (
            (antiModificator === true &&
              option.qsValue !== adjustingPropValue) ||
            (antiModificator === false && option.qsValue === adjustingPropValue)
          ) {
            const qs = Object.assign({}, currentPageProps.currentQs);

            qs[adjustingProp.qsName] = option.qsValue;

            // add mv_ prefix
            // TODO: do it in getOffersPage?
            Object.keys(qs).forEach(key => {
              const value = qs[key];
              delete qs[key];
              qs[`mv_${key}`] = value;
            });

            // change currentPage
            lastAsin = option.asin;

            currentPage = await getOffersPage(option.asin, qs);

            break propLoop;

            if (currentPage === false) {
              return false;
            }
          }
        }
      }
    }
  }

  const currentPageProps = parseProperties(currentPage);

  if (isPropsSame(currentPageProps.currentQs, neededProps) === true) {
    return {
      page: currentPage,
      asin: lastAsin
    };
  } else {
    return false;
  }
}

async function parseOfferListPage(asin) {
  // extract main properties
  const offersDOM = await getOffersPage(asin);

  const props = parseProperties(offersDOM);

  let defaultProps;
  let defaultOffersPage;
  let defaultAsin;

  const allSettingPropOptions = props.properties.reduce(
    (allSettingProps, prop) => {
      allSettingProps[prop.qsName] = "all";

      return allSettingProps;
    },
    {}
  );

  const allSettingPageResult = await findPageByProps(
    offersDOM,
    allSettingPropOptions,
    asin
  );
  const allSettingProps = parseProperties(allSettingPageResult.page);

  const priorityProps = [];

  for (const prop of allSettingProps.properties) {
    if (PRIORITY_PROPS[prop.qsName] !== void 0) {
      priorityProps.push(prop.qsName);
    }
  }

  if (priorityProps.length === 0) {
    const samplePropOptions = props.properties.reduce((sampleProps, prop) => {
      sampleProps[prop.qsName] = "!all";

      return sampleProps;
    }, {});

    const samplePageResult = await findPageByProps(
      offersDOM,
      samplePropOptions,
      asin
    );

    defaultOffersPage = samplePageResult.page;
    defaultProps = parseProperties(defaultOffersPage);
    defaultAsin = samplePageResult.asin;
  } else {
    defaultOffersPage = allSettingPageResult.page;
    defaultProps = allSettingProps;
    defaultAsin = allSettingPageResult.asin;
  }

  // trying to find common title and image
  let itemTitle = false;
  let itemImg = false;

  for (const page of [
    defaultOffersPage,
    allSettingPageResult.page,
    offersDOM
  ]) {
    const img = parseOffersImage(page);

    if (img === false || isImageUnavailable(img) === true) {
      continue;
    }

    itemImg = getHQImage(img) || img;
    itemTitle = parseOffersTitle(page);
  }

  // no properties
  if (defaultProps.properties.length === 0) {
    const variations = parseOffersVariations(defaultOffersPage);

    if (variations.length === 0) {
      return {
        name: itemTitle,
        img: itemImg,
        variants: []
      }
    }

    // TODO: just find lowest price variant
    // preprocess variations
    let lowestPriceVariant = variations[0];
    let lowestPrice = variations[0].price;

    for (const variant of variations) {
      if (variant.price < lowestPrice) {
        lowestPriceVariant = variant;
        lowestPrice = variant.price;
      }

      variant.props = variant.properties;
      variant.value = variant.price;
      variant.asin = asin;
      variant.name = itemTitle;
      variant.image = itemImg;

      delete variant.properties;
      delete variant.price;
    }

    return {
      name: itemTitle,
      img: itemImg,
      variants: [lowestPriceVariant]
    };
  }

  const propsToCombine = [];

  defaultProps.properties.forEach(prop => {
    const options = [];

    prop.options.forEach(option => {
      if (
        PRIORITY_PROPS[prop.qsName] !== void 0 ||
        defaultProps.properties.length === 1
      ) {
        // priority property
        if (option.value === LOWEST_OFFER_EACH) {
          return;
        }

        options.push({
          qsValue: option.qsValue,
          value: option.value
        });
      } else {
        if (option.value !== LOWEST_OFFER_EACH) {
          return;
        }

        options.push({
          qsValue: option.qsValue,
          value: option.value
        });
      }
    });

    propsToCombine.push({
      qsName: prop.qsName,
      title: prop.title,
      options
    });
  });

  // create options combinations
  // [[{<option>}, {<option>}], ...]
  const optionsCombinations = [];
  const headProp = propsToCombine[0];

  const getNextLevelCombinations = (initialCombination, propIndex) => {
    if (propsToCombine.length === propIndex) {
      return [initialCombination];
    }

    const combinations = [];

    propsToCombine[propIndex].options.forEach(option => {
      const combination = [];
      combination.push(...initialCombination);

      const combinaionElem = {
        ...option,
        qsName: propsToCombine[propIndex].qsName,
        title: propsToCombine[propIndex].title
      };

      combination.push(combinaionElem);
      combinations.push(
        ...getNextLevelCombinations(combination, propIndex + 1)
      );
    });

    return combinations;
  };

  headProp.options.forEach(option => {
    const combinationElem = {
      ...option,
      qsName: headProp.qsName,
      title: headProp.title
    };

    optionsCombinations.push(...getNextLevelCombinations([combinationElem], 1));
  });

  // scrape data(names, images) for distinctive items(items with different color etc)
  // so we can later add it to availableVariants
  const distinctiveItemsData = [];

  for (const combination of optionsCombinations) {
    const neededProps = combination.reduce((accum, option) => {
      let qsValue = option.qsValue;

      if (qsValue === "all") {
        qsValue = "!all";
      }

      accum[option.qsName] = qsValue;

      return accum;
    }, {});

    const result = await findPageByProps(
      defaultOffersPage,
      neededProps,
      defaultAsin
    );

    if (result !== false) {
      const page = result.page;
      const image = parseOffersImage(page);
      const title = parseOffersTitle(page);

      distinctiveItemsData.push({
        properties: neededProps,
        image: getHQImage(image) || image,
        title
      });
    }
  }

  // scrape available variants
  const allVariants = [];
  const variantsPromises = [];

  for (const combination of optionsCombinations) {
    const propsQs = combination.reduce((accum, option) => {
      accum[option.qsName] = option.qsValue;

      return accum;
    }, {});

    // const props = combination.reduce((accum, option) => {
    //   accum[option.title] = option.value;
    //
    //   return accum;
    // }, {});

    const promise = new Promise((resolve, reject) => {
      resolve(findPageByProps(defaultOffersPage, propsQs, defaultAsin));
    }).then(result => {
      if (result !== false) {
        const page = result.page;
        const variations = parseOffersVariations(page);

        if (variations === false) {
          return false;
        }

        const props = parseProperties(page);
        const currentProps = {};

        // preprocess current props
        for (const [key, value] of Object.entries(props.currentProperties)) {
          for (const prop of props.properties) {
            if (key === prop.qsName) {
              currentProps[prop.title] = value;
            }
          }
        }

        // add data to variants(distinctive, asin)
        // and change keys names
        for (const variant of variations) {
          const variantProps = {
            ...currentProps,
            ...variant.properties
          };

          variant.props = variantProps;
          variant.propsQs = propsQs;

          variant.value = variant.price;

          delete variant.properties;
          delete variant.price;

          let sameDistinctiveProps;

          for (const distinctiveItem of distinctiveItemsData) {
            sameDistinctiveProps = true;

            for (const [propName, propValue] of Object.entries(
              distinctiveItem.properties
            )) {
              if (propsQs[propName] !== propValue) {
                sameDistinctiveProps = false;
                break;
              }
            }

            if (sameDistinctiveProps === true) {
              variant.name = distinctiveItem.title;

              if (isImageUnavailable(distinctiveItem.image) === false) {
                variant.image = distinctiveItem.image;
              }

              break;
            }
          }

          variant.asin = result.asin;

          allVariants.push(variant);
        }
      }
    });

    variantsPromises.push(promise);
  }

  await Promise.all(variantsPromises);

  // postprocess(remove duplicates, remove propsQs)
  const availableVariants = allVariants.reduce((accum, variant) => {
    delete variant.propsQs;

    const samePropsVariantId = accum.findIndex(({ props }) => {
      if (Object.keys(variant.props).length !== Object.keys(props).length) {
        return false;
      }

      for (const [propName, propValue] of Object.entries(props)) {
        if (propValue !== variant.props[propName]) {
          return false;
        }
      }

      return true;
    });

    if (samePropsVariantId !== -1) {
      const samePropsVariant = accum[samePropsVariantId];

      if (variant.value < samePropsVariant.value) {
        accum.splice(samePropsVariantId, 1);
        accum.push(variant);
      }
    } else {
      accum.push(variant);
    }

    return accum;
  }, []);

  return {
    variants: availableVariants,
    name: itemTitle,
    img: itemImg
  };
}

module.exports = {
  parseOfferListPage,
  getOffersPage,
};
