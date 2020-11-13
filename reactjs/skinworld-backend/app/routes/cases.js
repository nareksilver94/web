const Joi = require("joi");
const mongoose = require("mongoose");
const router = require("express").Router();
const _ = require("lodash");
const formidable = require('formidable');

const { CaseModule, ImageModule, FileDataPipe } = require("../modules");
const {
  validate,
  isAuthenticated,
  has,
  populateAuthToken
} = require("../middleware");
const { caseTypes, userTypes, sortDirections, uploadImageTypes } = require("../constants");
const { utils } = require("../helpers");
const statistics = require("../modules/statistics");
const { errorMaker } = require('../helpers')

const { translate } = require('../i18n');
const getCasesSchema = {
  limit: Joi.number()
    .integer()
    .positive()
    .errorTranslate('BAD_REQUEST', 'validation.limit', { value: 0 }),
  offset: Joi.number()
    .integer()
    .when('limit', {
        is: Joi.exist(),
        then: Joi.exist()
    })
    .errorTranslate('BAD_REQUEST', 'validation.offset', { value: 0 }),
  sortBy: Joi.string()
    .errorTranslate('BAD_REQUEST', 'validation.sortBy'),
  sortDirection: Joi.string()
    .valid(['asc', 'desc'])
    .when('sortBy', {
        is: Joi.exist(),
        then: Joi.exist()
    })
    .errorTranslate('BAD_REQUEST', 'validation.sortDirection'),
  caseType: Joi.string()
    .valid(Object.values(caseTypes))
    .errorTranslate('BAD_REQUEST', 'validation.caseType',
      { value: Object.values(caseTypes).join(', ') }),
  name: Joi.string()
};

const getCaseSchema = {
  id: Joi.string().required()
};

const createCaseSchema = {
  name: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.name'),
  caseType: Joi.string()
    .valid(Object.keys(caseTypes))
    .errorTranslate('BAD_REQUEST', 'validation.caseType',
      { value: Object.values(caseTypes).join(', ') }),
  items: Joi.array()
    .items(
      Joi.object({
        item: Joi.string().required(),
        odd: Joi.number().min(0).max(100).required()
      })
    )
    .required(),
  affiliateCut: Joi.number()
    .min(0)
    .max(3)
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.affliateCut'),
  image: Joi.string()
    .regex(utils.REGEXS.caseImage)
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.invalidImage'),
};

const editCaseSchema = {
  id: Joi.string().required(),
  name: Joi.string(),
  image: Joi.string()
    .regex(utils.REGEXS.caseImage)
    .errorTranslate('BAD_REQUEST', 'validation.invalidImage'),
  affiliateCut: Joi.number()
    .min(0)
    .max(3)
    .errorTranslate('BAD_REQUEST', 'validation.affliateCut'),
  houseEdge: Joi.number()
    .min(0)
    .max(100)
    .errorTranslate('BAD_REQUEST', 'validation.houseEdge'),
  price: Joi.number()
    .min(0)
    .max(500),
  items: Joi.array()
    .items(
      Joi.object({
        item: Joi.string().required(),
        odd: Joi.number().min(0).max(100).required()
      })
    )
};

const casePriceSchema = {
  items: Joi.array()
    .items(
      Joi.object({
        item: Joi.string().required(),
        odd: Joi.number()
          .min(0)
          .max(100)
          .required()
      })
    ),
  houseEdge: Joi.number(),
  id: Joi.string()
};

const disableCaseSchema = {
  id: Joi.string().required()
};

const enableCaseSchema = {
  id: Joi.string().required()
};

const removeCategorySchema = {
  category: Joi.string()
    .valid(Object.values(caseTypes))
    .required(),
  caseId: Joi.string().required()
};

const addCategorySchema = {
  category: Joi.string()
    .valid(Object.values(caseTypes))
    .required(),
  caseId: Joi.string().required()
};

const editCaseItemSchema = {
  item: Joi.string()
    .required(),
  odd: Joi.required(),
  caseItemId: Joi.string()
    .required(),
  caseId: Joi.string().required()
};

const createCaseItemSchema = {
  item: Joi.string()
    .required(),
  odd: Joi.required(),
  caseId: Joi.string().required()
};

const removeCaseItemSchema = {
  caseItemId: Joi.string()
    .required(),
  caseId: Joi.string().required()
};

const prioritySchema = {
  orders: Joi.object().required(),
  id: Joi.string().required()
};

router.get("/images", isAuthenticated, async (req, res, next) => {
  try {
    const { type } = req.token;
    const result = await CaseModule.getCaseImages(type === userTypes.Admin);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get("/", validate(getCasesSchema), async (req, res, next) => {
  try {
    if (req.query.caseType !== void 0) {
      req.query.caseTypes = req.query.caseType;
      delete req.query.caseType;
    }

    let { limit, offset, sortBy, sortDirection, name, ...query } = req.query;
    const __query = {
      query: {
        ...query,
        isDisabled: false,
        caseTypes: { $ne: caseTypes.DAILY }
      },
      sort: {},
      select: {
        name: 1,
        image: 1,
        thumbnail: 1,
        slug: 1,
        price: 1,
        unboxCounts: 1,
      }
    };

    if (req.query.caseTypes !== void 0) {
      __query.sort[`orders.${req.query.caseTypes}`] = -1;

      const preveQueryArray = Object.keys(__query.query).map(key => ({
        [key]: __query.query[key]
      }));
      preveQueryArray.push({ caseTypes: req.query.caseTypes });
      __query.query = {
        $and: preveQueryArray
      };
    }

    if (name) {
      __query.$text = { $search: name };
      __query.query.name = new RegExp(name, "i");
    }
    if (limit && offset) {
      __query.pagination = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    }
    if (sortBy && sortDirection) {
      __query.sort[sortBy] = sortDirections[sortDirection];
    }
    if (req.query.caseType !== void 0) {
      __query.sort[`orders.${req.query.caseType}`] = -1;
    }
    const result = await CaseModule.getCases(__query);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get(
  "/all",
  isAuthenticated,
  has(userTypes.Admin),
  validate(getCasesSchema),
  async (req, res, next) => {
    try {
      if (req.query.caseType !== void 0) {
        req.query.caseTypes = req.query.caseType;
        delete req.query.caseType;
      }

      let { limit, offset, sortBy, sortDirection, name, ...query } = req.query;
      const __query = {
        query,
      };

      if (name) {
        __query.query.$text = { $search: name };
        __query.query.name = new RegExp(name, "i");
      }
      if (limit && offset) {
        __query.pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        __query.sort = { [sortBy]: sortDirections[sortDirection] };
      }
      const result = await CaseModule.getCases(__query);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/mine",
  isAuthenticated,
  validate(getCasesSchema),
  async (req, res, next) => {
    try {
      if (req.query.caseType !== void 0) {
        req.query.caseTypes = req.query.caseType;
        delete req.query.caseType;
      }

      let { limit, offset, sortBy, sortDirection } = req.query;
      const { id } = req.token;
      const __query = {
        query: {
          creator: mongoose.Types.ObjectId(id),
          isDisabled: false
        },
        select: {
          profit: 0,
          items: 0,
          oddRange: 0,
          isPriceModified: 0,
          houseEdge: 0,
          orders: 0,
          caseTypes: 0,
          isDisabled: 0,
          creator: 0
        }
      };

      if (limit && offset) {
        __query.pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        __query.sort = { [sortBy]: sortDirections[sortDirection] };
      }
      const result = await CaseModule.getCases(__query);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/daily", isAuthenticated, async (req, res, next) => {
  try {
    const __query = {
      query: { caseTypes: caseTypes.DAILY },
      select: {
        items: 1,
        unboxCounts: 1,
        name: 1,
        image: 1
      }
    };
    let [result] = await CaseModule.getCases(__query);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get(
  "/:id",
  isAuthenticated,
  validate(getCaseSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { type } = req.token;
      const result = await CaseModule.getCase(id, type === userTypes.Admin);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/:id/ordered-items",
  validate(getCaseSchema),
  populateAuthToken,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await CaseModule.getOrderedCaseItems(id, req.translate);

      utils.sendResponse(res, result);

      // add view to statistics
      const userId = req.token === void 0 ? void 0 : req.token.id;

      try {
        await statistics.cases.addCaseView(id, userId, req.isTest);
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/",
  isAuthenticated,
  validate(createCaseSchema),
  async (req, res, next) => {
    try {
      const payload = Object.assign({}, req.body, { creator: req.token.id });
      const { type } = req.token;

      if (payload.caseType && type === userTypes.Admin) {
        payload.caseTypes = [payload.caseType];
      }
      delete payload.caseType;

      const result = await CaseModule.createCase(payload, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    } 
  }
);

router.post(
  "/price",
  isAuthenticated,
  validate(casePriceSchema),
  async (req, res, next) => {
    try {
      const { id, ...data } = req.body;
      let payload;

      if (id) {
        payload = await CaseModule.getCase(id);
      } else {
        payload = data;
      }
      const priceResult = await CaseModule.helpers.validateCasePayload(
        payload,
        true,
        req.translate,
      );
      const items = priceResult.items.map(item => ({
        id: item._id,
        price: item.price
      }));

      return utils.sendResponse(res, {
        price: priceResult.price,
        items,
      });
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.delete("/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id, type } = req.token;
    const result = await CaseModule.disableCase(
      req.params.id,
      type !== userTypes.Admin ? id : null
    );

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.put(
  "/enable/:id",
  validate(enableCaseSchema, "params"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id, type } = req.token;
      const result = await CaseModule.enableCase(
        req.params.id,
        type !== userTypes.Admin ? id : null
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/remove-cat",
  validate(removeCategorySchema, "body"),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const result = await CaseModule.removeCategory(
        req.body.caseId,
        req.body.category,
        req.translate,
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/add-cat",
  validate(addCategorySchema, "body"),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const result = await CaseModule.addCategory(
        req.body.caseId,
        req.body.category,
        req.translate,
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/add-case-item",
  validate(createCaseItemSchema, "body"),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const result = await CaseModule.addCaseItem(
        req.body.caseId,
        req.body.item,
        req.body.odd
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/remove-case-item",
  validate(removeCaseItemSchema, "body"),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const result = await CaseModule.removeCaseItem(
        req.body.caseId,
        req.body.caseItemId
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/update-case-item",
  validate(editCaseItemSchema, "body"),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const result = await CaseModule.updateCaseItem(
        req.body.caseId,
        req.body.caseItemId,
        req.body.item,
        req.body.odd        
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/slugify",
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      CaseModule.slugify(req.body.type);

      return utils.sendResponse(res);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post("/claim-case-earnings", isAuthenticated, async (req, res, next) => {
  try {
    const result = await CaseModule.claimCaseEarnings(req.token.id);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.post(
  "/:id/orders",
  validate(prioritySchema),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { orders } = req.body;
      const result = await CaseModule.updatePriorities(id, orders, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.put(
  "/:id",
  validate(editCaseSchema),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await CaseModule.updateCase(id, req.body, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/:id/image",
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      new formidable.IncomingForm().parse(req, async (err, fields, files) => {
        if (err) {
          next(err);
        }
        try {

          const caseObj = await CaseModule.getCase(id, false, ['image', 'thumbnail']);
          let mainImageName = (caseObj.image) ? caseObj.image.split('/').slice(-1).pop() : '';
          let thumbImageName = (caseObj.thumbnail) ? caseObj.thumbnail.split('/').slice(-1).pop() : '';

          const filePipe = new FileDataPipe();
          ImageModule.setDataPipe(filePipe);
          const mainImage = await ImageModule.removeBackgroundAndUpload(
            files.image.path, 300, uploadImageTypes.CaseItem, mainImageName
          );
          const thumbImage = await ImageModule.removeBackgroundAndUpload(
            files.image.path, 180, uploadImageTypes.CaseItem, thumbImageName
          );

          const result = await CaseModule.updateCase(id, {
            image: mainImage,
            thumbnail: thumbImage,
          }, req.translate);
          
          return utils.sendResponse(res, {
            image: mainImage,
            thumbnail: thumbImage
          });
        } catch (error) {
          return utils.sendResponse(res, error);
        }
      });
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/:id/images-manual",
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      new formidable.IncomingForm().parse(req, async (err, fields, files) => {
        if (err) {
          next(err);
        }
        try {

          const caseObj = await CaseModule.getCase(id, false, ['image', 'thumbnail']);
          let mainImageName = (caseObj.image) ? caseObj.image.split('/').slice(-1).pop() : '';
          let thumbImageName = (caseObj.thumbnail) ? caseObj.thumbnail.split('/').slice(-1).pop() : '';

          const filePipe = new FileDataPipe();
          ImageModule.setDataPipe(filePipe);
          const mainImage = (files.image && files.image.path)
            ? await ImageModule.imageManualUpload(
                files.image.path, false, uploadImageTypes.CaseItem, mainImageName
              )
            : caseObj.image;
          const thumbImage = (files.thumbnail && files.thumbnail.path)
            ? await ImageModule.imageManualUpload(
                files.thumbnail.path, true, uploadImageTypes.CaseItem, thumbImageName
              )
            : caseObj.thumbnail;

          const result = await CaseModule.updateCase(id, {
            image: mainImage,
            thumbnail: thumbImage
          }, req.translate);
          
          return utils.sendResponse(res, {
            image: mainImage,
            thumbnail: thumbImage
          });
        } catch (error) {
          return utils.sendResponse(res, error);
        }
      });
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
