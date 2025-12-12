import prisma from "../lib/prisma.js";
import { getUserById } from "../services/userService.js";
import { publishCommentEvent } from "../services/sseService.js";

const resolvers = {
  Query: {
    getComments: async (_, { postId, limit = 20, cursor }) => {
      try {
        const comments = await prisma.comment.findMany({
          where: {
            postId,
            parentCommentId: null,
          },
          take: limit + 1,
          ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
          }),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        const hasMore = comments.length > limit;
        const commentsToReturn = hasMore ? comments.slice(0, -1) : comments;

        // Fetch user data and replies for each comment
        const commentsWithData = await Promise.all(
          commentsToReturn.map(async (comment) => {
            const user = await getUserById(comment.userId);

            // Fetch replies
            const replies = await prisma.comment.findMany({
              where: { parentCommentId: comment.id },
              orderBy: { createdAt: "asc" },
            });

            const repliesWithUsers = await Promise.all(
              replies.map(async (reply) => {
                const replyUser = await getUserById(reply.userId);
                return {
                  ...reply,
                  user: replyUser,
                  createdAt: reply.createdAt.toISOString(),
                  updatedAt: reply.updatedAt.toISOString(),
                  replies: [],
                };
              })
            );

            return {
              ...comment,
              user,
              createdAt: comment.createdAt.toISOString(),
              updatedAt: comment.updatedAt.toISOString(),
              replies: repliesWithUsers,
            };
          })
        );

        return {
          comments: commentsWithData,
          hasMore,
          nextCursor: hasMore
            ? commentsToReturn[commentsToReturn.length - 1].id
            : null,
        };
      } catch (error) {
        console.error("Error fetching comments:", error);
        throw new Error("Failed to fetch comments");
      }
    },
  },

  Mutation: {
    createComment: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error("Unauthorized. Please login first.");
      }

      const { postId, content, parentCommentId } = input;

      if (!content || content.trim().length === 0) {
        return {
          success: false,
          message: "Comment content is required",
          comment: null,
        };
      }

      try {
        const comment = await prisma.comment.create({
          data: {
            postId,
            userId: context.user.userId,
            content: content.trim(),
            parentCommentId: parentCommentId || null,
          },
        });

        const user = await getUserById(comment.userId);

        // Publish SSE event
        await publishCommentEvent(postId, "comment_added", {
          ...comment,
          user,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          replies: [],
        });

        return {
          success: true,
          message: "Comment created successfully",
          comment: {
            ...comment,
            user,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
            replies: [],
          },
        };
      } catch (error) {
        console.error("Error creating comment:", error);
        return {
          success: false,
          message: "Failed to create comment",
          comment: null,
        };
      }
    },

    deleteComment: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error("Unauthorized. Please login first.");
      }

      try {
        const comment = await prisma.comment.findUnique({
          where: { id },
        });

        if (!comment) {
          return {
            success: false,
            message: "Comment not found",
            comment: null,
          };
        }

        if (comment.userId !== context.user.userId) {
          return {
            success: false,
            message: "You can only delete your own comments",
            comment: null,
          };
        }

        // Delete replies first
        await prisma.comment.deleteMany({
          where: { parentCommentId: id },
        });

        // Delete the comment
        await prisma.comment.delete({
          where: { id },
        });

        // Publish SSE event
        await publishCommentEvent(comment.postId, "comment_deleted", {
          commentId: id,
        });

        return {
          success: true,
          message: "Comment deleted successfully",
          comment: null,
        };
      } catch (error) {
        console.error("Error deleting comment:", error);
        return {
          success: false,
          message: "Failed to delete comment",
          comment: null,
        };
      }
    },
  },
};

export default resolvers;
