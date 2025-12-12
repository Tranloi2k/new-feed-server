import { gql } from "apollo-server-express";

const typeDefs = gql`
  type User {
    id: Int!
    username: String!
    email: String!
    fullName: String
    avatarUrl: String
    bio: String
    isPrivate: Boolean!
    createdAt: String!
  }

  type Post {
    id: Int!
    userId: Int!
    user: User!
    content: String
    postType: String!
    mediaUrls: [String]
    location: String
    likeCount: Int!
    commentCount: Int!
    shareCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Comment {
    id: Int!
    postId: Int!
    userId: Int!
    user: User!
    parentCommentId: Int
    content: String!
    likeCount: Int!
    createdAt: String!
    updatedAt: String!
    replies: [Comment!]
  }

  type NewsFeedResponse {
    posts: [Post!]!
    hasMore: Boolean!
    nextCursor: Int
  }

  input CreatePostInput {
    content: String
    postType: String!
    mediaUrls: [String!]
    location: String
  }

  type CreatePostResponse {
    success: Boolean!
    message: String!
    post: Post
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

  type CommentsResponse {
    comments: [Comment!]!
    hasMore: Boolean!
    nextCursor: Int
  }

  type Query {
    hello: String
    getNewsFeed(limit: Int, cursor: Int): NewsFeedResponse!
    getComments(postId: Int!, limit: Int, cursor: Int): CommentsResponse!
  }

  type Mutation {
    createPost(input: CreatePostInput!): CreatePostResponse!
    createComment(input: CreateCommentInput!): CreateCommentResponse!
    deleteComment(commentId: Int!): CreateCommentResponse!
  }
`;

export default typeDefs;
