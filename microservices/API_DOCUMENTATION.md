# 🎯 NewFeed Microservices - API Documentation

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Authentication](#authentication)
- [Posts API (GraphQL)](#posts-api-graphql)
- [Comments API (GraphQL + SSE)](#comments-api-graphql--sse)
- [Media Upload API (REST)](#media-upload-api-rest)
- [Real-time Events (SSE)](#real-time-events-sse)

---

## 🌐 Tổng quan

**Base URL (API Gateway):** `http://localhost:8080`

### Headers chung

```
Content-Type: application/json
Cookie: token=<jwt_token>  # Sau khi login
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔐 Authentication

### 1. Đăng ký (Sign Up)

**Endpoint:** `POST /api/auth/signup`

**Request:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "avatarUrl": null,
    "bio": null,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### 2. Đăng nhập (Login)

**Endpoint:** `POST /api/auth/login`

**Request:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Note:** Token được set tự động vào httpOnly cookie.

### 3. Lấy thông tin user hiện tại

**Endpoint:** `GET /api/auth/me`

**Headers:**

```
Cookie: token=<jwt_token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "avatarUrl": "https://...",
    "bio": "Software engineer"
  }
}
```

### 4. Đăng xuất (Logout)

**Endpoint:** `POST /api/auth/logout`

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📝 Posts API (GraphQL)

**Endpoint:** `POST /graphql`

### Schema Types

```graphql
type User {
  id: Int!
  username: String!
  email: String!
  fullName: String
  avatarUrl: String
}

type Post {
  id: Int!
  userId: Int!
  user: User
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
```

### 1. Tạo post mới

**Request:**

```json
{
  "query": "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { success message post { id content user { username avatarUrl } createdAt } } }",
  "variables": {
    "input": {
      "content": "Hello microservices world!",
      "postType": "TEXT"
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "createPost": {
      "success": true,
      "message": "Post created successfully",
      "post": {
        "id": 1,
        "content": "Hello microservices world!",
        "user": {
          "username": "johndoe",
          "avatarUrl": "https://..."
        },
        "createdAt": "2025-01-15T10:30:00Z"
      }
    }
  }
}
```

### 2. Tạo post với hình ảnh

**Request:**

```json
{
  "query": "mutation { createPost(input: { content: \"Check this out!\", postType: \"IMAGE\", mediaUrls: [\"https://res.cloudinary.com/.../image1.jpg\"] }) { success post { id mediaUrls } } }"
}
```

### 3. Lấy News Feed

**Request:**

```json
{
  "query": "query GetNewsFeed($limit: Int, $cursor: Int) { getNewsFeed(limit: $limit, cursor: $cursor) { posts { id content postType user { username avatarUrl } mediaUrls likeCount commentCount shareCount createdAt } hasMore nextCursor } }",
  "variables": {
    "limit": 10,
    "cursor": null
  }
}
```

**Response:**

```json
{
  "data": {
    "getNewsFeed": {
      "posts": [
        {
          "id": 5,
          "content": "Beautiful sunset today!",
          "postType": "IMAGE",
          "user": {
            "username": "johndoe",
            "avatarUrl": "https://..."
          },
          "mediaUrls": ["https://res.cloudinary.com/.../sunset.jpg"],
          "likeCount": 24,
          "commentCount": 8,
          "shareCount": 3,
          "createdAt": "2025-01-15T18:00:00Z"
        }
      ],
      "hasMore": true,
      "nextCursor": 4
    }
  }
}
```

### 4. Lấy một post cụ thể

**Request:**

```json
{
  "query": "query { getPost(id: 1) { id content user { username } createdAt } }"
}
```

### 5. Xóa post

**Request:**

```json
{
  "query": "mutation { deletePost(id: 1) { success message } }"
}
```

**Response:**

```json
{
  "data": {
    "deletePost": {
      "success": true,
      "message": "Post deleted successfully"
    }
  }
}
```

**Note:** Khi post bị xóa, tất cả comments của post đó cũng tự động xóa (RabbitMQ event).

---

## 💬 Comments API (GraphQL + SSE)

### GraphQL Schema

```graphql
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
```

### 1. Tạo comment mới

**Endpoint:** `POST /graphql`

**Request:**

```json
{
  "query": "mutation CreateComment($input: CreateCommentInput!) { createComment(input: $input) { success message comment { id content user { username avatarUrl } createdAt } } }",
  "variables": {
    "input": {
      "postId": 1,
      "content": "Great post! Thanks for sharing."
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "createComment": {
      "success": true,
      "message": "Comment created successfully",
      "comment": {
        "id": 15,
        "content": "Great post! Thanks for sharing.",
        "user": {
          "username": "johndoe",
          "avatarUrl": "https://..."
        },
        "createdAt": "2025-01-15T11:00:00Z"
      }
    }
  }
}
```

### 2. Tạo reply (comment lồng)

**Request:**

```json
{
  "query": "mutation { createComment(input: { postId: 1, content: \"Thanks!\", parentCommentId: 15 }) { success comment { id } } }"
}
```

### 3. Lấy danh sách comments

**REST Endpoint:** `GET /api/comments/:postId?limit=20&cursor=10`

**Response:**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 15,
        "postId": 1,
        "content": "Great post!",
        "user": {
          "id": 1,
          "username": "johndoe",
          "avatarUrl": "https://..."
        },
        "likeCount": 5,
        "createdAt": "2025-01-15T11:00:00Z",
        "replies": [
          {
            "id": 16,
            "content": "Thanks!",
            "user": {
              "username": "janedoe"
            },
            "createdAt": "2025-01-15T11:05:00Z"
          }
        ]
      }
    ],
    "hasMore": false,
    "nextCursor": null
  }
}
```

### 4. Xóa comment

**Request:**

```json
{
  "query": "mutation { deleteComment(id: 15) { success message } }"
}
```

**Response:**

```json
{
  "data": {
    "deleteComment": {
      "success": true,
      "message": "Comment deleted successfully"
    }
  }
}
```

**Note:** Xóa comment sẽ xóa luôn tất cả replies của nó.

---

## 🖼️ Media Upload API (REST)

### 1. Upload single image

**Endpoint:** `POST /api/media/upload/image`

**Headers:**

```
Content-Type: multipart/form-data
Cookie: token=<jwt_token>
```

**Form Data:**

```
image: <file>
```

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": 1,
    "url": "https://res.cloudinary.com/demo/image/upload/v1234567890/newfeed/images/abc123.jpg",
    "publicId": "newfeed/images/abc123",
    "width": 1200,
    "height": 800
  }
}
```

**Supported formats:** JPEG, PNG, GIF, WebP  
**Max size:** 10MB

### 2. Upload single video

**Endpoint:** `POST /api/media/upload/video`

**Form Data:**

```
video: <file>
```

**Response:**

```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": 2,
    "url": "https://res.cloudinary.com/demo/video/upload/v1234567890/newfeed/videos/xyz789.mp4",
    "publicId": "newfeed/videos/xyz789",
    "width": 1920,
    "height": 1080
  }
}
```

**Supported formats:** MP4, MPEG, QuickTime  
**Max size:** 10MB

### 3. Upload multiple images

**Endpoint:** `POST /api/media/upload/images`

**Form Data:**

```
images: <file1>
images: <file2>
images: <file3>
```

**Response:**

```json
{
  "success": true,
  "message": "3 images uploaded successfully",
  "data": [
    {
      "id": 3,
      "url": "https://res.cloudinary.com/.../image1.jpg",
      "publicId": "newfeed/images/img1",
      "width": 800,
      "height": 600
    },
    {
      "id": 4,
      "url": "https://res.cloudinary.com/.../image2.jpg",
      "publicId": "newfeed/images/img2",
      "width": 1024,
      "height": 768
    },
    {
      "id": 5,
      "url": "https://res.cloudinary.com/.../image3.jpg",
      "publicId": "newfeed/images/img3",
      "width": 1200,
      "height": 900
    }
  ]
}
```

**Max files:** 10 images

### 4. Delete media

**Endpoint:** `DELETE /api/media/:id`

**Response:**

```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

**Note:** Xóa media cũng xóa file trên Cloudinary.

---

## 🔴 Real-time Events (SSE)

### Kết nối SSE cho real-time comments

**Endpoint:** `GET /api/sse/comments/:postId`

### Client-side JavaScript Example

```javascript
// Kết nối đến SSE endpoint
const postId = 1;
const eventSource = new EventSource(
  `http://localhost:8080/api/sse/comments/${postId}`,
  {
    withCredentials: true, // Gửi cookies
  }
);

// Lắng nghe khi kết nối thành công
eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "connected") {
    console.log("✅ Connected to post:", data.postId);
  }
});

// Lắng nghe events từ server
eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  switch (data.eventType) {
    case "comment_added":
      console.log("💬 New comment:", data.data);
      // Thêm comment vào UI
      addCommentToUI(data.data);
      break;

    case "comment_deleted":
      console.log("🗑️ Comment deleted:", data.data.commentId);
      // Xóa comment khỏi UI
      removeCommentFromUI(data.data.commentId);
      break;
  }
});

// Xử lý lỗi
eventSource.onerror = (error) => {
  console.error("❌ SSE error:", error);

  // Tự động reconnect sau 5s
  setTimeout(() => {
    eventSource.close();
    // Tạo lại connection
  }, 5000);
};

// Đóng connection khi component unmount
function cleanup() {
  eventSource.close();
}
```

### Event Format

#### Connected Event

```json
{
  "type": "connected",
  "postId": 1
}
```

#### Comment Added Event

```json
{
  "postId": 1,
  "eventType": "comment_added",
  "data": {
    "id": 20,
    "postId": 1,
    "userId": 3,
    "content": "Nice post!",
    "parentCommentId": null,
    "likeCount": 0,
    "user": {
      "id": 3,
      "username": "alice",
      "avatarUrl": "https://..."
    },
    "createdAt": "2025-01-15T12:00:00Z",
    "replies": []
  },
  "timestamp": "2025-01-15T12:00:00.500Z"
}
```

#### Comment Deleted Event

```json
{
  "postId": 1,
  "eventType": "comment_deleted",
  "data": {
    "commentId": 20
  },
  "timestamp": "2025-01-15T12:05:00.500Z"
}
```

### React Example

```jsx
import { useEffect, useState } from "react";

function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Fetch initial comments
    fetchComments(postId).then(setComments);

    // Connect to SSE
    const eventSource = new EventSource(
      `http://localhost:8080/api/sse/comments/${postId}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.eventType === "comment_added") {
        setComments((prev) => [data.data, ...prev]);
      }

      if (data.eventType === "comment_deleted") {
        setComments((prev) => prev.filter((c) => c.id !== data.data.commentId));
      }
    };

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [postId]);

  return (
    <div>
      {comments.map((comment) => (
        <Comment key={comment.id} data={comment} />
      ))}
    </div>
  );
}
```

---

## 🔗 Complete Flow Example

### Tạo post với media và real-time comments

```javascript
// 1. Upload image
const formData = new FormData();
formData.append("image", imageFile);

const uploadRes = await fetch("http://localhost:8080/api/media/upload/image", {
  method: "POST",
  credentials: "include",
  body: formData,
});
const { data: media } = await uploadRes.json();

// 2. Create post with media URL
const postRes = await fetch("http://localhost:8080/graphql", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `mutation { createPost(input: { 
      content: "Check this out!", 
      postType: "IMAGE", 
      mediaUrls: ["${media.url}"] 
    }) { 
      success 
      post { id } 
    } }`,
  }),
});
const postData = await postRes.json();
const postId = postData.data.createPost.post.id;

// 3. Connect to SSE for real-time comments
const eventSource = new EventSource(
  `http://localhost:8080/api/sse/comments/${postId}`,
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.eventType === "comment_added") {
    console.log("New comment:", data.data);
  }
};

// 4. Create comment
await fetch("http://localhost:8080/graphql", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `mutation { createComment(input: { 
      postId: ${postId}, 
      content: "Great photo!" 
    }) { 
      success 
      comment { id } 
    } }`,
  }),
});

// → SSE event sẽ tự động fire và UI update!
```

---

## 📊 Rate Limiting

**API Gateway Rate Limit:**

- **Limit:** 100 requests per 15 minutes per IP
- **Response khi vượt limit:**

```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

**Status Code:** `429 Too Many Requests`

---

## 🛡️ Error Codes

| Status Code | Meaning               | Example                          |
| ----------- | --------------------- | -------------------------------- |
| 200         | Success               | Request thành công               |
| 400         | Bad Request           | Missing required fields          |
| 401         | Unauthorized          | JWT token invalid/expired        |
| 403         | Forbidden             | Không có quyền xóa post của user |
| 404         | Not Found             | Post/Comment không tồn tại       |
| 429         | Too Many Requests     | Vượt rate limit                  |
| 500         | Internal Server Error | Lỗi server                       |
| 503         | Service Unavailable   | Service đang bảo trì             |

---

## 🧪 Testing với cURL

### 1. Register & Login

```bash
# Register
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@test.com","password":"Test123"}'

# Get current user
curl http://localhost:8080/api/auth/me \
  -b cookies.txt
```

### 2. Create Post

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query":"mutation { createPost(input: { content: \"Hello\", postType: \"TEXT\" }) { success post { id } } }"}'
```

### 3. Upload Image

```bash
curl -X POST http://localhost:8080/api/media/upload/image \
  -b cookies.txt \
  -F "image=@/path/to/image.jpg"
```

### 4. SSE Connection

```bash
curl -N http://localhost:8080/api/sse/comments/1 \
  -b cookies.txt
```

---

## 📚 Tài liệu bổ sung

- [GETTING_STARTED.md](./GETTING_STARTED.md) - Hướng dẫn setup và chạy dự án
- [README.md](./README.md) - Tổng quan kiến trúc microservices
- [Docker Compose](./docker-compose.yml) - Cấu hình orchestration

---

**Built with ❤️ - NewFeed Microservices Platform**
