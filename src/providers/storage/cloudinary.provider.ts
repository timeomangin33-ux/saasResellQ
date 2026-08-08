export const CloudinaryProvider = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',

  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',

  uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`
  },
}
