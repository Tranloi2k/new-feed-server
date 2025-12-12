// SSE Service để quản lý connections
class SSEService {
  constructor() {
    // Map để lưu trữ các clients đang subscribe theo postId
    // Format: { postId: [{ res, userId }, ...] }
    this.connections = new Map();
  }

  // Thêm client mới subscribe vào post
  addConnection(postId, res, userId) {
    if (!this.connections.has(postId)) {
      this.connections.set(postId, []);
    }

    const connection = { res, userId };
    this.connections.get(postId).push(connection);

    console.log(`Client ${userId} subscribed to post ${postId}`);
    console.log(
      `Total connections for post ${postId}: ${
        this.connections.get(postId).length
      }`
    );

    return connection;
  }

  // Xóa connection khi client disconnect
  removeConnection(postId, connection) {
    if (!this.connections.has(postId)) return;

    const connections = this.connections.get(postId);
    const index = connections.indexOf(connection);

    if (index > -1) {
      connections.splice(index, 1);
      console.log(
        `Client ${connection.userId} unsubscribed from post ${postId}`
      );
    }

    // Xóa postId nếu không còn connections
    if (connections.length === 0) {
      this.connections.delete(postId);
      console.log(`No more connections for post ${postId}, removed from map`);
    }
  }

  // Gửi event đến tất cả clients đang subscribe post
  sendToPost(postId, event, data) {
    if (!this.connections.has(postId)) {
      console.log(`No connections for post ${postId}`);
      return;
    }

    const connections = this.connections.get(postId);
    const deadConnections = [];

    connections.forEach((connection) => {
      try {
        const sseData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        connection.res.write(sseData);
        console.log(
          `Sent ${event} to client ${connection.userId} for post ${postId}`
        );
      } catch (error) {
        console.error(`Error sending to client ${connection.userId}:`, error);
        deadConnections.push(connection);
      }
    });

    // Xóa các connections bị lỗi
    deadConnections.forEach((connection) => {
      this.removeConnection(postId, connection);
    });
  }

  // Gửi comment mới
  sendNewComment(postId, comment) {
    this.sendToPost(postId, "new_comment", {
      type: "new_comment",
      comment,
    });
  }

  // Gửi comment đã xóa
  sendDeletedComment(postId, commentId) {
    this.sendToPost(postId, "delete_comment", {
      type: "delete_comment",
      commentId,
    });
  }

  // Gửi comment count update
  sendCommentCountUpdate(postId, count) {
    this.sendToPost(postId, "comment_count", {
      type: "comment_count",
      count,
    });
  }

  // Lấy số lượng connections cho post
  getConnectionCount(postId) {
    return this.connections.get(postId)?.length || 0;
  }

  // Lấy tất cả postIds đang có connections
  getActivePostIds() {
    return Array.from(this.connections.keys());
  }
}

// Export singleton instance
const sseService = new SSEService();
export default sseService;
