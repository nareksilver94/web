const HTMLing = require('htmling');
const { get } = require('lodash');

// available languages
const en = require('./en');
const ru = require('./ru');
const ar = require('./ar');

const langs = {
  en,
  ru,
  ar
};

const translate = (key, data = {}, lang = 'en') => {
  try {
    if (lang in langs === false) {
      lang = 'en';
    }

    const translations = langs[lang];
    const message = get(translations, key, key);

    return HTMLing.string(message).render(data);
  } catch (error) {
    return key;
  }
}

module.exports = {
  translate,
  langs,
}
