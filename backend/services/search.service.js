import { findAll, count } from "../db/index.js";

export const searchCars = async ({
  keyword,
  minPrice,
  maxPrice,
  brand,
  year,
  minMileage,
  maxMileage,
  sort = "latest",
  page = 1,
  limit = 12,
}) => {
  const filters = { status: "available" };

  if (brand) filters.brand = brand;
  if (year) filters.year = Number(year);

  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = Number(minPrice);
    if (maxPrice) filters.price.$lte = Number(maxPrice);
  }

  if (minMileage || maxMileage) {
    filters.mileage = {};
    if (minMileage) filters.mileage.$gte = Number(minMileage);
    if (maxMileage) filters.mileage.$lte = Number(maxMileage);
  }

  let orderBy = "createdAt";
  let ascending = false;
  if (sort === "price_asc") { orderBy = "price"; ascending = true; }
  if (sort === "price_desc") { orderBy = "price"; ascending = false; }
  if (sort === "popular") { orderBy = "views"; ascending = false; }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    findAll("cars", { filters, orderBy, ascending, limit, offset: skip }),
    count("cars", filters),
  ]);

  return {
    data,
    pagination: { total, page, pages: Math.ceil(total / limit) },
  };
};
