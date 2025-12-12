import { gql } from "apollo-server-express";

const typeDefs = gql`
  type User {
    id: Int!
    username: String!
    email: String!
    fullName: String
    avatarUrl: String
  }

  type Comment {
    id: Int!
    postId: Int!
    userId: Int!
    user: User
    content: String!
    parentCommentId: Int
    likeCount: Int!
    createdAt: String!
    updatedAt: String!
    replies: [Comment]
  }

  type CommentsResponse {
    comments: [Comment!]!
    hasMore: Boolean!
    nextCursor: Int
  }

  input CreateCommentInput {
    postId: Int!
    content: String!
    parentCommentId: Int
  }

  type CreateCommentResponse {
    success: Boolean!
    message: String!
    comment: Comment
  }

  type Query {
    getComments(postId: Int!, limit: Int, cursor: Int): CommentsResponse!
  }

  type Mutation {
    createComment(input: CreateCommentInput!): CreateCommentResponse!
    deleteComment(id: Int!): CreateCommentResponse!
  }
`;

export default typeDefs;
