const express = require('express');
const reviewControler = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router.route('/').get(reviewControler.getAllReviews).post(
  authController.restrictTo('user'),
  // reviewControler.getTourUserId,
  reviewControler.createReview
);

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewControler.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewControler.updateReview
  );

module.exports = router;
