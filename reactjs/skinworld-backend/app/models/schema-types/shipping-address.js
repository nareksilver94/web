const mongoose = require("mongoose");
const { shippingCountries } = require("../../constants");

const shippingAddress = {
  firstName: String,
  lastName: String,
  phoneNumber: String,
  address: String,
  postalCode: String,
  country: {
    type: String,
    enum: Object.values(shippingCountries)
  },
  city: String,
  province: String,
  email: String
};

module.exports = shippingAddress;
