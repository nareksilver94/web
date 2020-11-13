const { ITEM_COLOR_MAPPING } = require("../../constants");

const getItemColors = price => {
  for (let i = 0; i < ITEM_COLOR_MAPPING.length; i++) {
    const lowPrice = ITEM_COLOR_MAPPING[i].value;
    const highPrice = ITEM_COLOR_MAPPING[i + 1]
      ? ITEM_COLOR_MAPPING[i + 1].value
      : Number.MAX_VALUE;

    if (lowPrice <= price && price < highPrice) {
      return ITEM_COLOR_MAPPING[i].color;
    }
  }
};

module.exports = {
  getItemColors
};
