import cloudinary from "../config/cloudinary.js";
import prisma from "../lib/prisma.js";
import { Readable } from "stream";

export async function uploadImage(file, userId) {
  try {
    // Convert buffer to stream
    const stream = Readable.from(file.buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "newfeed/images",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto" },
          ],
        },
        async (error, result) => {
          if (error) {
            reject(error);
          } else {
            try {
              // Save metadata to database
              const media = await prisma.media.create({
                data: {
                  userId,
                  url: result.secure_url,
                  publicId: result.public_id,
                  type: "image",
                  size: result.bytes,
                  width: result.width,
                  height: result.height,
                },
              });

              resolve({
                id: media.id,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
              });
            } catch (dbError) {
              reject(dbError);
            }
          }
        }
      );

      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Upload image error:", error);
    throw error;
  }
}

export async function uploadVideo(file, userId) {
  try {
    const stream = Readable.from(file.buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "newfeed/videos",
          resource_type: "video",
          transformation: [{ quality: "auto" }],
        },
        async (error, result) => {
          if (error) {
            reject(error);
          } else {
            try {
              const media = await prisma.media.create({
                data: {
                  userId,
                  url: result.secure_url,
                  publicId: result.public_id,
                  type: "video",
                  size: result.bytes,
                  width: result.width,
                  height: result.height,
                },
              });

              resolve({
                id: media.id,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
              });
            } catch (dbError) {
              reject(dbError);
            }
          }
        }
      );

      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Upload video error:", error);
    throw error;
  }
}

export async function deleteMedia(mediaId, userId) {
  try {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    if (media.userId !== userId) {
      throw new Error("Unauthorized to delete this media");
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(media.publicId, {
      resource_type: media.type === "video" ? "video" : "image",
    });

    // Delete from database
    await prisma.media.delete({
      where: { id: mediaId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete media error:", error);
    throw error;
  }
}
