/* eslint-disable import/no-extraneous-dependencies */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const tourModel = require('../Models/tourModel');
const bookingModel = require('../Models/bookingModel');
const factory = require('./handlerFactory');

exports.getCheckoutSessions = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await tourModel.findById(req.params.tourId);
  if (!tour) {
    return next(new AppError('There is no tour with that id.', 404));
  }
  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    // client_reference_id: req.params.tourId,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });
  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying 
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) {
    return next();
  }
  await bookingModel.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(bookingModel);
exports.getBooking = factory.getOne(bookingModel);
exports.getAllBooking = factory.getAll(bookingModel);
exports.updateBooking = factory.updateOne(bookingModel);
exports.deleteBooking = factory.deleteOne(bookingModel);
