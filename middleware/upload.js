import multer from "multer";
import path from "path";

// Cấu hình storage cho multer (memory storage để upload trực tiếp lên Cloudinary)
const storage = multer.memoryStorage();

// File filter để chỉ cho phép upload ảnh và video
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  // Check if file is image
  if (
    mimetype.startsWith("image/") &&
    allowedImageTypes.test(extname.slice(1))
  ) {
    cb(null, true);
  }
  // Check if file is video
  else if (
    mimetype.startsWith("video/") &&
    allowedVideoTypes.test(extname.slice(1))
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only images (JPEG, JPG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI, MKV, WEBM) are allowed!"
      ),
      false
    );
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

export default upload;
