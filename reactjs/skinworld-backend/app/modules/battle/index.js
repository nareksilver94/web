const battleCreate = require('./create');
const battleGet = require('./get');
const battleUpdate = require('./update');
const battleDelete = require('./delete');

module.exports = {
  ...battleCreate,
  ...battleGet,
  ...battleUpdate,
  ...battleDelete
}