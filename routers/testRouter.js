import express from "express";
import { AppError } from "../utilites/AppError.js";
import { StatusCodes } from "../constants/statusCodes.js";

const router = express.Router();

router.get("/operational", (req, res, next) => {
  next(new AppError("Custom operational error!", StatusCodes.BAD_REQUEST));
});

router.get("/programming", (req, res, next) => {
  const x = undefined;
  x.foo = "bar";
});

router.get("/mongoose-cast", (req, res, next) => {
  const castErr = new Error("Cast to ObjectId failed");
  castErr.name = "CastError";
  castErr.path = "userId";
  castErr.value = "12345_invalid";
  next(castErr);
});

export default router;