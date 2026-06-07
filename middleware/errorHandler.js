import { StatusCodes } from "../constants/statusCodes.js";
import { ServerMessages } from "../constants/serverMessages.js";

const wantsJson = (req) => req.xhr || req.accepts(["html", "json"]) === "json";

export const notFoundHandler = (req, res, next) => {
  const error = new Error(ServerMessages.ROUTE_NOT_FOUND);
  error.statusCode = StatusCodes.NOT_FOUND;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message =
    statusCode === StatusCodes.INTERNAL_SERVER_ERROR
      ? ServerMessages.INTERNAL_SERVER_ERROR
      : err.message || ServerMessages.INTERNAL_SERVER_ERROR;

  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (wantsJson(req)) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  return res.status(statusCode).send(message);
};
