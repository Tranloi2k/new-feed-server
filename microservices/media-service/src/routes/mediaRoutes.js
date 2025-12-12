import express from "express";
import multer from "multer";
import {
  uploadImage,
  uploadVideo,
  deleteMedia,
} from "../services/cloudinaryService.js";

const router = express.Router();

// Multer config - store in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

// Upload single image
router.post("/upload/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get userId from header (set by API Gateway)
    const userId = parseInt(req.headers["x-user-id"]);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await uploadImage(req.file, userId);

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
});

// Upload single video
router.post("/upload/video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userId = parseInt(req.headers["x-user-id"]);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await uploadVideo(req.file, userId);

    res.json({
      success: true,
      message: "Video uploaded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Upload video error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload video",
    });
  }
});

// Upload multiple images
router.post("/upload/images", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const userId = parseInt(req.headers["x-user-id"]);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const uploadPromises = req.files.map((file) => uploadImage(file, userId));
    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Upload images error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload images",
    });
  }
});

// Delete media
router.delete("/:id", async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);
    const userId = parseInt(req.headers["x-user-id"]);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await deleteMedia(mediaId, userId);

    res.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete media",
    });
  }
});

export default router;
