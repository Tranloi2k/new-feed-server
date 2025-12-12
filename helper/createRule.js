import { rateLimitRules } from "../config/rateLimitRules.js";
import { createRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

function createRateLimiterFromRule(rule, keyGeneratorFn) {
  return createRateLimitMiddleware({
    windowMs: rule.windowMs,
    maxRequests: rule.maxRequests,
    message: rule.message,
    keyGenerator: keyGeneratorFn,
  });
}

export const authLimiter = createRateLimiterFromRule(
  rateLimitRules.auth.login,
  (req) =>
    `login:${req.body.username || req.body.email || "anonymous"}:${req.ip}`
);

// helper/createRule.js
export const graphqlQueryLimiter = createRateLimiterFromRule(
  rateLimitRules.graphql?.query || {
    windowMs: 60000,
    maxRequests: 100,
    message: "Too many GraphQL queries",
  },
  (req) => `graphql:query:${req.user?.userId || req.ip}`
);

export const graphqlMutationLimiter = createRateLimiterFromRule(
  rateLimitRules.graphql?.mutation || {
    windowMs: 60000,
    maxRequests: 50,
    message: "Too many GraphQL mutations",
  },
  (req) => `graphql:mutation:${req.user?.userId || req.ip}`
);
