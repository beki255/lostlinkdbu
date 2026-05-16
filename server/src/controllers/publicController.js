const CmsPage = require('../models/CmsPage');
const { sendSuccess } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');

exports.getPageBySlug = async (req, res, next) => {
  try {
    const page = await CmsPage.findOne({ 
      slug: req.params.slug, 
      status: 'published',
      isDeleted: false 
    });

    if (!page) throw new NotFoundError('Page');

    sendSuccess(res, { page });
  } catch (error) {
    next(error);
  }
};
