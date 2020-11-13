const unless = (paths, middleware) => {
  if (paths instanceof Array === false) {
    paths = [paths];
  }

  return (req, res, next) => {
    for (const path of paths) {
      if (req.path.startsWith(path)) {
        return next();
      }
    }

    return middleware(req, res, next);
  };
};

module.exports = unless;
