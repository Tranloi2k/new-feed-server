# Upload Media Implementation với Cloudinary

## Cấu hình

### 1. Thêm Cloudinary credentials vào `.env`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Lấy credentials từ: https://cloudinary.com/console

## API Endpoints

### 1. Upload Media (REST API)

**Endpoint:** `POST /api/media/upload`

**Headers:**

```
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

**Body:** Form-data

- Key: `media` (file)
- Có thể upload tối đa 10 files cùng lúc

**Response:**

```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "files": [
      {
        "url": "https://res.cloudinary.com/...",
        "publicId": "newfeed/posts/...",
        "resourceType": "image",
        "format": "jpg",
        "width": 1920,
        "height": 1080
      }
    ]
  }
}
```

### 2. Create Post với Media (GraphQL)

**Mutation:**

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    success
    message
    post {
      id
      content
      postType
      mediaUrls
      location
      likeCount
      commentCount
      shareCount
      createdAt
      user {
        id
        username
        fullName
        avatarUrl
      }
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "content": "Check out my new photos!",
    "postType": "IMAGE",
    "mediaUrls": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/newfeed/posts/abc123.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/newfeed/posts/def456.jpg"
    ],
    "location": "Hanoi, Vietnam"
  }
}
```

## Flow Upload từ Frontend

### 1. Upload files trước

```javascript
const uploadFiles = async (files) => {
  const formData = new FormData();

  // Thêm files vào FormData
  files.forEach((file) => {
    formData.append("media", file);
  });

  const response = await fetch("http://localhost:3004/api/media/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();
  return result.data.files.map((file) => file.url);
};
```

### 2. Tạo post với URLs đã upload

```javascript
import { useMutation, gql } from "@apollo/client";

const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      success
      message
      post {
        id
        content
        postType
        mediaUrls
        createdAt
        user {
          username
          avatarUrl
        }
      }
    }
  }
`;

function CreatePostForm() {
  const [createPost] = useMutation(CREATE_POST);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Upload files lên Cloudinary
    const mediaUrls = await uploadFiles(selectedFiles);

    // 2. Tạo post với media URLs
    const { data } = await createPost({
      variables: {
        input: {
          content: postContent,
          postType: "IMAGE",
          mediaUrls: mediaUrls,
          location: location,
        },
      },
    });

    if (data.createPost.success) {
      console.log("Post created:", data.createPost.post);
    }
  };

  return <form onSubmit={handleSubmit}>{/* Your form fields */}</form>;
}
```

## Supported File Types

### Images:

- JPEG, JPG, PNG, GIF, WEBP

### Videos:

- MP4, MOV, AVI, MKV, WEBM

### Limits:

- Max file size: 50MB
- Max files per request: 10

## Cloudinary Transformations

Service hỗ trợ custom transformations khi upload:

```javascript
const uploadResults = await uploadMultipleFiles(files, {
  folder: "newfeed/posts",
  transformation: [
    { width: 1200, height: 1200, crop: "limit" },
    { quality: "auto" },
    { fetch_format: "auto" },
  ],
});
```

## Error Handling

```javascript
try {
  const mediaUrls = await uploadFiles(files);
  // ... create post
} catch (error) {
  if (error.message.includes("Only images")) {
    alert("Chỉ chấp nhận ảnh và video!");
  } else if (error.message.includes("Failed to upload")) {
    alert("Upload thất bại. Vui lòng thử lại!");
  }
}
```
