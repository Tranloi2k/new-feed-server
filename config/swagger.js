import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "New Feed Server API",
      version: "1.0.0",
      description: "API documentation for New Feed social media platform",
      contact: {
        name: "API Support",
        email: "support@newfeed.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3004",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "User ID",
            },
            username: {
              type: "string",
              description: "Username",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            fullName: {
              type: "string",
              description: "Full name",
              nullable: true,
            },
            bio: {
              type: "string",
              description: "User bio",
              nullable: true,
            },
            avatarUrl: {
              type: "string",
              description: "Avatar URL",
              nullable: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              description: "Username or email",
              example: "admin@example.com",
            },
            password: {
              type: "string",
              description: "Password",
              example: "admin123",
            },
          },
        },
        SignupRequest: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            username: {
              type: "string",
              description: "Username",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
              example: "john@example.com",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "Password (minimum 6 characters)",
              example: "password123",
            },
            fullName: {
              type: "string",
              description: "Full name",
              example: "John Doe",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Đăng nhập thành công",
            },
            data: {
              type: "object",
              properties: {
                accessToken: {
                  type: "string",
                  description: "JWT access token",
                },
                userId: {
                  type: "integer",
                  description: "User ID",
                },
                user: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            error: {
              type: "string",
              description: "Error details (development only)",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
