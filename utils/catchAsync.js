module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next); // this will send the error to the global error handler which is errorController.js
};
