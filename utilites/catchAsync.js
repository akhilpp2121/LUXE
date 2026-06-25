/**
 * Wraps asynchronous Express route handlers to catch rejected promises
 * and pass the error to the next() middleware.
 * 
 * @param {Function} fn - Asynchronous route handler or middleware
 * @returns {Function} Express handler with automatic catch block
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
