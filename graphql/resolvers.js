import prisma from "../lib/prisma.js";
import sseService from "../services/sseService.js";

const resolvers = {
  Query: {
    hello: () => "Hello from GraphQL!",

    getComments: async (_, { postId, limit = 20, cursor }) => {
      try {
        // Lấy comments của post (chỉ lấy top-level comments, không lấy replies)
        const comments = await prisma.comment.findMany({
          where: {
            postId,
            parentCommentId: null, // Chỉ lấy comment gốc
          },
          take: limit + 1,
          ...(cursor && {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                bio: true,
                isPrivate: true,
                createdAt: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    avatarUrl: true,
                    bio: true,
                    isPrivate: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        const hasMore = comments.length > limit;
        const commentsToReturn = hasMore ? comments.slice(0, -1) : comments;

        return {
          comments: commentsToReturn.map((comment) => ({
            ...comment,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
            user: {
              ...comment.user,
              createdAt: comment.user.createdAt.toISOString(),
            },
            replies: comment.replies.map((reply) => ({
              ...reply,
              createdAt: reply.createdAt.toISOString(),
              updatedAt: reply.updatedAt.toISOString(),
              user: {
                ...reply.user,
                createdAt: reply.user.createdAt.toISOString(),
              },
            })),
          })),
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

    getNewsFeed: async (_, { limit = 10, cursor }, context) => {
      try {
        // Lấy userId từ context (sau khi authenticate)
        // const userId = context.user?.id;

        // Tạm thời lấy tất cả posts (có thể filter theo following sau)
        const posts = await prisma.post.findMany({
          take: limit + 1, // Lấy thêm 1 để kiểm tra hasMore
          ...(cursor && {
            cursor: {
              id: cursor,
            },
            skip: 1, // Skip cursor item
          }),
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" }, // Thêm id để đảm bảo stable sorting
          ],
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                bio: true,
                isPrivate: true,
                createdAt: true,
              },
            },
          },
        });

        const hasMore = posts.length > limit;
        const postsToReturn = hasMore ? posts.slice(0, -1) : posts;

        return {
          posts: postsToReturn.map((post) => ({
            ...post,
            postType: post.postType.toUpperCase(), // Convert to uppercase để match với enum
            mediaUrls: post.mediaUrls
              ? JSON.parse(JSON.stringify(post.mediaUrls))
              : [],
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            user: {
              ...post.user,
              createdAt: post.user.createdAt.toISOString(),
            },
          })),
          hasMore,
          nextCursor: hasMore
            ? postsToReturn[postsToReturn.length - 1].id
            : null,
        };
      } catch (error) {
        console.error("Error fetching news feed:", error);
        throw new Error("Failed to fetch news feed");
      }
    },
  },

  Mutation: {
    createPost: async (_, { input }, context) => {
      try {
        // Kiểm tra authentication
        if (!context || !context.user) {
          throw new Error("Unauthorized. Please login first.");
        }

        const { content, postType, mediaUrls, location } = input;

        // Validate input
        if (!postType) {
          return {
            success: false,
            message: "Post type is required",
            post: null,
          };
        }

        // Validate post type với media
        if (postType === "IMAGE" || postType === "VIDEO") {
          if (!mediaUrls || mediaUrls.length === 0) {
            return {
              success: false,
              message: `${postType} post must have media URLs`,
              post: null,
            };
          }
        }

        // Tạo post mới
        const newPost = await prisma.post.create({
          data: {
            userId: context.user.id,
            content: content || null,
            postType: postType,
            mediaUrls: mediaUrls && mediaUrls.length > 0 ? mediaUrls : null,
            location: location || null,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                bio: true,
                isPrivate: true,
                createdAt: true,
              },
            },
          },
        });

        return {
          success: true,
          message: "Post created successfully",
          post: {
            ...newPost,
            postType: newPost.postType.toUpperCase(),
            mediaUrls: newPost.mediaUrls
              ? JSON.parse(JSON.stringify(newPost.mediaUrls))
              : [],
            createdAt: newPost.createdAt.toISOString(),
            updatedAt: newPost.updatedAt.toISOString(),
            user: {
              ...newPost.user,
              createdAt: newPost.user.createdAt.toISOString(),
            },
          },
        };
      } catch (error) {
        console.error("Error creating post:", error);
        return {
          success: false,
          message: "Failed to create post",
          post: null,
        };
      }
    },

    createComment: async (_, { input }, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("Unauthorized. Please login first.");
        }

        const { postId, content, parentCommentId } = input;

        // Validate input
        if (!content || content.trim().length === 0) {
          return {
            success: false,
            message: "Comment content is required",
            comment: null,
          };
        }

        // Kiểm tra post có tồn tại
        const post = await prisma.post.findUnique({
          where: { id: postId },
        });

        if (!post) {
          return {
            success: false,
            message: "Post not found",
            comment: null,
          };
        }

        // Nếu là reply, kiểm tra parent comment có tồn tại
        if (parentCommentId) {
          const parentComment = await prisma.comment.findUnique({
            where: { id: parentCommentId },
          });

          if (!parentComment) {
            return {
              success: false,
              message: "Parent comment not found",
              comment: null,
            };
          }
        }

        // Tạo comment mới
        const newComment = await prisma.comment.create({
          data: {
            postId,
            userId: context.user.id,
            content: content.trim(),
            parentCommentId: parentCommentId || null,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                bio: true,
                isPrivate: true,
                createdAt: true,
              },
            },
          },
        });

        // Cập nhật commentCount của post
        const updatedPost = await prisma.post.update({
          where: { id: postId },
          data: {
            commentCount: {
              increment: 1,
            },
          },
        });

        const formattedComment = {
          ...newComment,
          createdAt: newComment.createdAt.toISOString(),
          updatedAt: newComment.updatedAt.toISOString(),
          user: {
            ...newComment.user,
            createdAt: newComment.user.createdAt.toISOString(),
          },
          replies: [],
        };

        // Gửi SSE event đến tất cả clients đang subscribe post này
        sseService.sendNewComment(postId, formattedComment);
        sseService.sendCommentCountUpdate(postId, updatedPost.commentCount);

        return {
          success: true,
          message: "Comment created successfully",
          comment: formattedComment,
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

    deleteComment: async (_, { commentId }, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("Unauthorized. Please login first.");
        }

        // Tìm comment
        const comment = await prisma.comment.findUnique({
          where: { id: commentId },
        });

        if (!comment) {
          return {
            success: false,
            message: "Comment not found",
            comment: null,
          };
        }

        // Kiểm tra quyền xóa (chỉ chủ comment mới xóa được)
        if (comment.userId !== context.user.id) {
          return {
            success: false,
            message: "You don't have permission to delete this comment",
            comment: null,
          };
        }

        // Đếm số lượng replies
        const repliesCount = await prisma.comment.count({
          where: { parentCommentId: commentId },
        });

        // Xóa comment (cascade sẽ tự động xóa replies)
        await prisma.comment.delete({
          where: { id: commentId },
        });

        // Cập nhật commentCount của post (trừ cả comment và replies)
        const updatedPost = await prisma.post.update({
          where: { id: comment.postId },
          data: {
            commentCount: {
              decrement: 1 + repliesCount,
            },
          },
        });

        // Gửi SSE event đến tất cả clients đang subscribe post này
        sseService.sendDeletedComment(comment.postId, commentId);
        sseService.sendCommentCountUpdate(
          comment.postId,
          updatedPost.commentCount
        );

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
