/* eslint-disable new-cap */
const multer = require('multer');
const sharp = require('sharp');
const TourModel = require('../Models/tourModel');
// const APIFeatures = require('../utils/APIFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const handleFactory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // Test if the uploaded file is an image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// multiple images with multiple name ---> .fields([{ name: 'imageCover', maxCount: 1 }, { name: 'images', maxCount: 3 }])
exports.uploadTourImage = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// single image with single name ---> .single('image')
// multiple images with single name ---> .array('images', 5)

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  // `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 3/2 ratio
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, index) => {
      // `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;
      const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333) // 3/2 ratio
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );
  next() 
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // BUILD QUERY
//   // 1A) Filtering ---> on top of the file (exports.aliasTopTours)

//   // 2) Sorting ---> on top of the file (exports.aliasTopTours)

//   // 3) Field limiting ---> on top of the file (exports.aliasTopTours)

//   // 4) Pagination ---> on top of the file (exports.aliasTopTours)

//   //5) Aliasing ---> on top of the file (exports.aliasTopTours)

//   // EXECUTE QUERY
//   const features = new APIFeatures(TourModel.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

exports.getAllTours = handleFactory.getAll(TourModel);

// exports.getTour = handleFactory.getOne(TourModel, { path: 'reviews' });
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await TourModel.findById(req.params.id).populate('reviews');

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});
exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await TourModel.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
});

exports.updateTour = handleFactory.updateOne(TourModel);

exports.deleteTour = handleFactory.deleteOne(TourModel);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   await TourModel.findByIdAndDelete(req.params.id, () => {
//     next(new AppError('No tour found with that ID', 404));
//   });

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await TourModel.aggregate([
    {
      $match: { ratingAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // _id: '$difficulty',
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyplan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await TourModel.aggregate([
    {
      $unwind: '$startDates', // opens an array and creates a document for each element of the array
    },
    {
      $match: {
        // "match" ye sirf un un documents ko show kare ga jin jin ke startDate satisfiy kare ga
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        // "Group" ye sirf un un fields ko show kare ga jo jo humne yaha pe mention kiye hain
        _id: { $month: '$startDates' },
        sumTour: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      // "addFields" ye humare document me ek aur field add kar deta hai
      $addFields: { month: '$_id' },
    },
    {
      // "project" ye humare document me se kuch fields ko hide kar deta hai
      $project: { _id: 0 },
    },
    {
      // "sort" ye humare document ko sort kar deta hai
      $sort: { sumTour: -1 },
    },
    {
      // "limit" ye humare document me se sirf utne documents ko show kare ga jitne humne yaha pe mention kiye hain
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // 3963.2 is the radius of earth in miles and 6378.1 is the radius of earth in km

  if (!lat || !lng) {
    next(
      new ('Please provide latitude and longitude in the format lat,lng', 400)()
    );
  }

  const tours = await TourModel.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

// /distance/:latlung/unit/:unit

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlung, unit } = req.params;
  const [lat, lng] = latlung.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // 3963.2 is the radius of earth in miles and 6378.1 is the radius of earth in km

  if (!lat || !lng) {
    next(
      new ('Please provide latitude and longitude in the format lat,lng', 400)()
    );
  }

  const distance = await TourModel.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // 0.000621371 is the conversion factor from km to miles and 0.001 is the conversion factor from miles to km
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distance,
    },
  });
});
