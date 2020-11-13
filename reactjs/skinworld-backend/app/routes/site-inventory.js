const Joi = require("joi");
const router = require("express").Router();
const formidable = require('formidable');

const { InventoryModule, ImageModule, CaseModule, UrlDataPipe, FileDataPipe } = require("../modules");
const { validate, isAuthenticated } = require("../middleware");
const { itemTypes, userTypes, sortDirections, uploadImageTypes } = require("../constants");
const { has } = require("../middleware");
const {
  amazonProvider,
  stockxProvider
} = require("../modules/trade-providers");
const { translate } = require('../i18n');
const { errorMaker, utils } = require('../helpers')

const addItemSchema = {
  data: Joi.array()
    .items(
      Joi.object({
        assetId: Joi.string().required()
          .errorTranslate('BAD_REQUEST', 'deposit.assetId'),
        type: Joi.string().valid(Object.values(itemTypes)).required()
          .errorTranslate('BAD_REQUEST', 'validation.itemType'),
        tag: Joi.string(),
        name: Joi.string(),
        value: Joi.number().greater(0)
      })
    )
}

const updateItemSchema = {
  id: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'validation.itemId'),
  tag: Joi.string(),
  name: Joi.string(),
  value: Joi.string(),
  type: Joi.string().valid(Object.values(itemTypes))
};

const getItemSchema = {
  id: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'validation.itemId')
};

const getItemsSchema = {
  limit: Joi.number()
    .integer()
    .positive(),
  offset: Joi.number()
    .integer()
    .when("limit", {
      is: Joi.exist(),
      then: Joi.exist()
    }),
  sortBy: Joi.string(),
  sortDirection: Joi.string()
    .valid(["asc", "desc"])
    .when("sortBy", {
      is: Joi.exist(),
      then: Joi.exist()
    }),
  search: Joi.string(),
  tag: Joi.string(),
  type: Joi.string()
    .valid(Object.values(itemTypes))
};

const getClosestItemsSchema = {
  price: Joi.number().greater(0),
  multiplier: Joi.number().valid([1.5, 2, 5, 10, 20])
};

router.get(
  "/",
  isAuthenticated,
  validate(getItemsSchema),
  async (req, res, next) => {
    try {
      
      const { type } = req.token;
      let { limit, offset, sortBy, sortDirection, ...query } = req.query;
      let pagination, sort, select;

      if (query.search) {
        query.$text = { $search: query.search };
        query.name = new RegExp(query.search, "i");
        delete query.search;
      }
      if (limit && offset) {
        pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        sort = { [sortBy]: sortDirections[sortDirection] };
      }
      if (type === userTypes.User) {
        query.value = { $gt: 0 };
      }
      if (type === userTypes.User) {
        select = "name type value assetId color image tag isDisabled";
      }
      query.value = { $gt: 0 };

      const result = await InventoryModule.getSiteInventory(
        query,
        pagination,
        sort,
        select
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/closest",
  isAuthenticated,
  validate(getClosestItemsSchema),
  async (req, res, next) => {
    try {
      const { price, multiplier } = req.query;
      const result = await InventoryModule.getClosestSiteItem(
        price,
        multiplier
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/:id", validate(getItemSchema), async (req, res, next) => {
  try {
    const { id, type } = req.params;
    let select = "-createdAt -updatedAt";
    const result = await InventoryModule.getSiteItem(id, select);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.post(
  "/",
  isAuthenticated,
  has(userTypes.Admin),
  validate(addItemSchema),
  async (req, res, next) => {
    try {
      new formidable.IncomingForm().parse(req, async (err, fields, files) => {
        if (err) {
          next(err);
        }

        try {
          const filePipe = new FileDataPipe();
          ImageModule.setDataPipe(filePipe);
          const mainImage = files.image
            ? await ImageModule.removeBackgroundAndUpload(
               files.image.path, 240, uploadImageTypes.ItemImage
              )
            : '';
          const thumbImage = files.thumbnail
            ? await ImageModule.removeBackgroundAndUpload(
                files.thumbnail.path, 100, uploadImageTypes.ItemImage
              )
            : '';

          const payload = {
            type: fields.type,
            name: fields.name,
            assetId: fields.assetId,
            tag: fields.tag,
            value: fields.value,
            image: mainImage,
            thumbnail: thumbImage
          };

          const result = await InventoryModule.addSiteItems(payload, req.token.id);
          return utils.sendResponse(res, result);
        } catch (error) {
          return utils.sendResponse(res, error);
        }          
      });

    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.put(
  "/:id",
  isAuthenticated,
  has(userTypes.Admin),
  validate(updateItemSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await InventoryModule.editItem(id, req.body, req.token.id, req.translate);

      return utils.sendResponse(res);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/sync-desc",
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      amazonProvider.syncAmazonDesc();
      stockxProvider.syncStockxDesc();

      return utils.sendResponse(res);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/sync-price",
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      amazonProvider.syncAmazonMain(true);
      stockxProvider.syncStockxPrices(true);

      return utils.sendResponse(res);
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

          const siteItem = await InventoryModule.getSiteItem(id, ['image', 'thumbnail']);
          let mainImageName = (siteItem.image) ? siteItem.image.split('/').slice(-1).pop() : '';
          let thumbImageName = (siteItem.thumbnail) ? siteItem.thumbnail.split('/').slice(-1).pop() : '';

          const filePipe = new FileDataPipe();
          ImageModule.setDataPipe(filePipe);
          const mainImage = await ImageModule.removeBackgroundAndUpload(
            files.image.path, 240, uploadImageTypes.ItemImage, mainImageName
          );
          const thumbImage = await ImageModule.removeBackgroundAndUpload(
            files.image.path, 100, uploadImageTypes.ItemImage, thumbImageName
          );

          const response = await InventoryModule.updateItem(id, {
            image: mainImage,
            imageModified: true,
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
          const siteItem = await InventoryModule.getSiteItem(id, ['image', 'thumbnail']);
          // let mainImageName = (siteItem.image) ? siteItem.image.split('/').slice(-1).pop() : '';
          // let thumbImageName = (siteItem.thumbnail) ? siteItem.thumbnail.split('/').slice(-1).pop() : '';
          if (siteItem.image) {
            await ImageModule.deleteS3Image(siteItem.image);
          }
          if (siteItem.thumbnail) {
            await ImageModule.deleteS3Image(siteItem.thumbnail);
          }

          const filePipe = new FileDataPipe();
          ImageModule.setDataPipe(filePipe);
          const mainImage = (files.image && files.image.path)
            ? await ImageModule.imageManualUpload(
                files.image.path, false, uploadImageTypes.ItemImage, ''
              )
            : siteItem.image;
          const thumbImage = (files.thumbnail && files.thumbnail.path)
            ? await ImageModule.imageManualUpload(
                files.thumbnail.path, true, uploadImageTypes.ItemImage, ''
              )
            : siteItem.thumbnail;

          const response = await InventoryModule.updateItem(id, {
            image: mainImage,
            imageModified: true,
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
