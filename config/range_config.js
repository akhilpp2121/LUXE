import dayjs from "dayjs";

const rangeConfigs = {
  weekly: (now) => ({
    start: now.subtract(6, "day").startOf("day").toDate(),
    dateFormat: "%Y-%m-%d",
    bucketCount: 7,
    stepUnit: "day"
  }),

  monthly: (now) => ({
    start: now.subtract(11, "month").startOf("month").toDate(),
    dateFormat: "%Y-%m",
    bucketCount: 12,
    stepUnit: "month"
  }),

  yearly: (now) => ({
    start: now.subtract(4, "year").startOf("year").toDate(),
    dateFormat: "%Y",
    bucketCount: 5,
    stepUnit: "year"
  })
};

export const getRangeConfig = (range = "monthly") => {
  const now = dayjs();
  const configFn = rangeConfigs[range] || rangeConfigs.monthly;
  return configFn(now);
};