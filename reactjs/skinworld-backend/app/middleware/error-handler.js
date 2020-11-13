module.exports = (err, req, res, next) => {
  if (err) {
    res.status(err.status || 500).json({
      name: err.name || err.message,
      message: err.description || err.message
    });
  } else {
    next();
  }
};
