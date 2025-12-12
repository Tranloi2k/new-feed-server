// middleware/graphqlRateLimiter.js
import {
  graphqlQueryLimiter,
  graphqlMutationLimiter,
} from "../helper/createRule.js";

export function graphqlRateLimiter(req, res, next) {
  // Parse GraphQL operation type
  const body = req.body;

  if (!body || !body.query) {
    return next();
  }

  const query = body.query;
  const isMutation = query.trim().startsWith("mutation");
  const isQuery =
    query.trim().startsWith("query") ||
    (!isMutation && !query.includes("mutation"));

  // Apply appropriate limiter
  if (isMutation) {
    return graphqlMutationLimiter(req, res, next);
  } else if (isQuery) {
    return graphqlQueryLimiter(req, res, next);
  }

  next();
}
