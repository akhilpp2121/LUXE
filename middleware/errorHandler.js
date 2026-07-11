import { StatusCodes } from "../constants/statusCodes.js";
import {
  ROUTE_NOT_FOUND,
  INTERNAL_SERVER_ERROR,
} from "../constants/serverMessages.js";
import { AppError } from "../utilites/AppError.js";
const wantsJson = (req) => {
  return (
    req.xhr ||
    req.headers.accept?.includes("application/json") ||
    req.accepts(["json", "html"]) === "json"
  ); //  json first
};

const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}.`, StatusCodes.BAD_REQUEST);

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] || "";
  return new AppError(
    `Duplicate field value: ${value}. Please use another value!`,
    StatusCodes.CONFLICT,
  );
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError(
    `Invalid input data. ${errors.join(". ")}`,
    StatusCodes.BAD_REQUEST,
  );
};

const sendErrorDev = (err, req, res) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || INTERNAL_SERVER_ERROR;

  if (wantsJson(req)) {
    return res
      .status(statusCode)
      .json({ success: false, message, error: err, stack: err.stack });
  }

  return res.status(statusCode).render("Users/error", {
    error: {
      statusCode,
      title:
        err.status === "fail" ? "Operation Failed" : "Internal Server Error",
      message,
      stack: err.stack,
    },
  });
};

const sendErrorProd = (err, req, res) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || INTERNAL_SERVER_ERROR;

  if (!err.isOperational) {
    statusCode = 500;
    message = INTERNAL_SERVER_ERROR;
  }

  if (wantsJson(req)) {
    return res.status(statusCode).json({ success: false, message });
  }

  return res.status(statusCode).render("Users/error", {
    error: {
      statusCode,
      title: statusCode === 404 ? "Page Not Found" : "Error Occurred",
      message,
    },
  });
};

export const notFoundHandler = (req, res, next) => {
  next(new AppError(ROUTE_NOT_FOUND, StatusCodes.NOT_FOUND));
};

export const errorHandler = (err, req, res, next) => {
  console.error(" Error:", err);

  if (res.headersSent) return next(err);

  if (process.env.NODE_ENV === "production") {
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;
    error.isOperational = err.isOperational;

    if (err.name === "CastError") error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === "ValidationError") error = handleValidationErrorDB(error);

    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(err, req, res);
  }
};
