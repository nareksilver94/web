const Joi = require("joi");
const { utils, errorMaker } = require('../helpers');
const { translate: _translate } = require('../i18n');

Object.getPrototypeOf(Joi.any()).errorTranslate = function errorTranslate(type, key, data) {
  return this.meta({
    trError: {
      type,
      key,
      data,
    }
  });
};

module.exports = (schemaObject, source) => {
  return (req, res, next) => {
    let payload;
    const __schema = { ...schemaObject };
    let { translate } = req;

    translate = translate || _translate;

    if (source === "body") {
      payload = req.body;
    } else if (source === "params") {
      payload = req.params;
    } else if (source === "query") {
      payload = req.query;
    } else {
      payload = Object.assign(
        {},
        req.params || {},
        req.query || {},
        req.body || {}
      );
    }

    for (const schemaKey in __schema) {
      if (__schema[schemaKey]._meta !== void 0) {
        for (const meta of __schema[schemaKey]._meta) {
          // find translation error meta
          if ('trError' in meta === false) {
            continue;
          }

          const { type, key, data } = meta.trError;
          __schema[schemaKey] = __schema[schemaKey].error(
            errorMaker(type, translate(key, data)),
          );
        }
      }

      // let { error, schema } = __schema[key];
      //
      // if (error && error.type) {
      //   schema = schema.error(
      //     errorMaker(error.type, translate(error.trKey, error.trData))
      //   );
      // }
      // __schema[key] = schema;
    }

    Joi.validate(payload, Joi.object().keys(__schema), (err, result) => {
      next(err)
    });
  };
};
