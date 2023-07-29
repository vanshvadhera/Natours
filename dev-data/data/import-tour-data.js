const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const TourModel = require('../../Models/tourModel');
const UserModel = require('../../Models/userModel');
const ReviewModel = require('../../Models/reviewModal');

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection successful!'));

// READ JSON FILE
const tours = JSON.parse(
  fs.readFileSync('./dev-data/data/tours.json', 'utf-8')
);
const users = JSON.parse(
  fs.readFileSync('./dev-data/data/users.json', 'utf-8')
);
const reviews = JSON.parse(
  fs.readFileSync('./dev-data/data/reviews.json', 'utf-8')
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await TourModel.create(tours, { validateBeforeSave: false });
    await UserModel.create(users, { validateBeforeSave: false });
    await ReviewModel.create(reviews);
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await TourModel.deleteMany();
    await UserModel.deleteMany();
    await ReviewModel.deleteMany();
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

