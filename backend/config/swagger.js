import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KAYAD API",
      version: "1.0.0",
      description: "KAYAD Car Marketplace — Live Auctions, M-Pesa Payments, Escrow, Dealer Management",
      contact: {
        name: "KAYAD API Support",
        email: "api@kayad.co.ke",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1 - Current stable version"
      },
      {
        url: "https://api.kayad.co.ke/api/v1",
        description: "Production API v1"
      },
      {
        url: "https://staging-api.kayad.co.ke/api/v1",
        description: "Staging API v1"
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token obtained from /api/v1/auth/login",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            details: { type: "object" },
            errors: { type: "array", items: { type: "object" } },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["user", "dealer", "admin", "inspector"] },
            phone: { type: "string" },
            isEmailVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Car: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            brand: { type: "string" },
            model: { type: "string" },
            year: { type: "integer" },
            price: { type: "number" },
            status: { type: "string", enum: ["active", "sold", "pending", "rejected"] },
            auctionStatus: { type: "string", enum: ["draft", "live", "ended"] },
            fuel: { type: "string" },
            transmission: { type: "string" },
            mileage: { type: "number" },
            images: {
              type: "array",
              items: { type: "object" },
            },
            dealer: { $ref: "#/components/schemas/User" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Bid: {
          type: "object",
          properties: {
            _id: { type: "string" },
            carId: { type: "string" },
            amount: { type: "number" },
            status: { type: "string", enum: ["pending", "paid", "failed"] },
            userId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Escrow: {
          type: "object",
          properties: {
            _id: { type: "string" },
            amount: { type: "number" },
            status: { type: "string", enum: ["held", "released", "refunded", "disputed"] },
            buyer: { $ref: "#/components/schemas/User" },
            seller: { $ref: "#/components/schemas/User" },
            car: { $ref: "#/components/schemas/Car" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 5 },
          },
        },
      },
    },
    tags: [
      { name: "Authentication", description: "User authentication and authorization" },
      { name: "Cars", description: "Car listings and management" },
      { name: "Bids", description: "Auction bidding operations" },
      { name: "Dealers", description: "Dealer operations and management" },
      { name: "Admin", description: "Administrative operations" },
      { name: "Payments", description: "Payment processing" },
      { name: "Escrow", description: "Escrow management" },
      { name: "Chat", description: "Messaging system" },
      { name: "Notifications", description: "User notifications" },
    ],
  },
  apis: ["./routes/**/*.js", "./controllers/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
