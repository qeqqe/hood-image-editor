const express = require("express");
const sharp = require("sharp");
const multer = require("multer");
const cors = require("cors");

const app = express();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const ALLOWED_FORMATS = ["jpeg", "jpg", "png", "webp", "avif", "gif"];

const FORMAT_OPTIONS = {
  jpeg: { quality: 80, mozjpeg: true },
  jpg: { quality: 80, mozjpeg: true },
  png: { compressionLevel: 9, palette: true },
  webp: { quality: 75, lossless: false },
  avif: { quality: 65, lossless: false },
  gif: { colours: 256 },
};

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "File upload error: " + err.message });
  }
  next(err);
});

async function validateAndProcessImage(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    console.log("Image metadata:", metadata);
    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image file");
    }
    return { metadata, pipeline: sharp(buffer) };
  } catch (error) {
    console.error("Validation error:", error);
    throw error;
  }
}

app.post("/resize", upload.single("image"), async (req, res) => {
  try {
    const { width, height, fit = "fill", position = "center" } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const { metadata, pipeline } = await validateAndProcessImage(
      req.file.buffer
    );
    const parsedWidth = parseInt(width) || metadata.width;
    const parsedHeight = parseInt(height) || metadata.height;

    if (parsedWidth <= 0 || parsedHeight <= 0) {
      return res.status(400).json({ error: "Invalid dimensions" });
    }

    const resizedImage = await pipeline
      .resize(parsedWidth, parsedHeight, {
        fit,
        position,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: false, // Allow enlargement
      })
      .toFormat(metadata.format, FORMAT_OPTIONS[metadata.format] || {})
      .toBuffer();

    res.type(`image/${metadata.format}`).send(resizedImage);
  } catch (err) {
    console.error("Error processing image:", err);
    res.status(500).json({ error: err.message || "Image processing failed" });
  }
});

app.post("/convert", upload.single("image"), async (req, res) => {
  try {
    const { format } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const targetFormat = format?.toLowerCase();
    if (!ALLOWED_FORMATS.includes(targetFormat)) {
      return res.status(400).json({ error: `Unsupported format: ${format}` });
    }

    // Get original filename without extension
    const originalName = req.file.originalname.split(".")[0];

    const imageBuffer = await sharp(req.file.buffer)
      .toFormat(targetFormat, FORMAT_OPTIONS[targetFormat] || {})
      .toBuffer();

    // Set proper headers for file download
    res.set({
      "Content-Type": `image/${targetFormat}`,
      "Content-Disposition": `attachment; filename=${originalName}.${targetFormat}`,
      "Content-Length": imageBuffer.length,
    });

    res.send(imageBuffer);
  } catch (err) {
    console.error("Conversion error:", err);
    res.status(500).json({ error: "Failed to convert image: " + err.message });
  }
});

// app.post("/convert", upload.single("image"), async (req, res) => {
//   try {
//     const { format } = req.body;
//     if (!req.file) {
//       return res.status(400).json({ error: "No image file provided" });
//     }

//     const targetFormat = format?.toLowerCase();
//     if (!ALLOWED_FORMATS.includes(targetFormat)) {
//       return res.status(400).json({ error: `Unsupported format: ${format}` });
//     }

//     const imageBuffer = await sharp(req.file.buffer)
//       .toFormat(targetFormat, {
//         quality: 100,
//         chromaSubsampling: "4:4:4",
//         force: true,
//       })
//       .toBuffer();

//     res.set({
//       "Content-Type": `image/${targetFormat}`,
//       "Content-Disposition": `attachment; filename=converted.${targetFormat}`,
//     });

//     res.send(imageBuffer);
//   } catch (err) {
//     console.error("Conversion error:", err);
//     res.status(500).json({ error: "Failed to convert image: " + err.message });
//   }
// });

app.post("/optimize", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const { metadata, pipeline } = await validateAndProcessImage(
      req.file.buffer
    );
    const options = FORMAT_OPTIONS[metadata.format] || {};

    const optimizedImage = await pipeline
      .toFormat(metadata.format, options)
      .toBuffer();

    res.type(`image/${metadata.format}`).send(optimizedImage);
  } catch (err) {
    console.error("Error processing image:", err);
    res.status(500).json({ error: err.message || "Image processing failed" });
  }
});

app.post("/rotate", upload.single("image"), async (req, res) => {
  try {
    const { angle = 0, background = "#ffffff" } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const { metadata, pipeline } = await validateAndProcessImage(
      req.file.buffer
    );
    const parsedAngle = parseInt(angle);

    const rotatedImage = await pipeline
      .rotate(parsedAngle, { background })
      .toFormat(metadata.format, FORMAT_OPTIONS[metadata.format] || {})
      .toBuffer();

    res.type(`image/${metadata.format}`).send(rotatedImage);
  } catch (err) {
    console.error("Error processing image:", err);
    res.status(500).json({ error: err.message || "Image processing failed" });
  }
});

app.post("/effects", upload.single("image"), async (req, res) => {
  try {
    const { effect, value, brightness, saturation, hue } = req.body;
    if (!req.file)
      return res.status(400).json({ error: "No image file provided" });

    const { metadata, pipeline } = await validateAndProcessImage(
      req.file.buffer
    );

    switch (effect) {
      case "blur":
        pipeline.blur(parseInt(value) || 5);
        break;
      case "sharpen":
        pipeline.sharpen(parseInt(value) || 5);
        break;
      case "modulate":
        pipeline.modulate({
          brightness: parseFloat(brightness) || 1,
          saturation: parseFloat(saturation) || 1,
          hue: parseInt(hue) || 0,
        });
        break;
      case "grayscale":
        pipeline.grayscale();
        break;
      case "sepia":
        pipeline.sepia();
        break;
      case "negate":
        pipeline.negate();
        break;
      case "tint":
        pipeline.tint({ r: 255, g: 240, b: 16 });
        break;
      case "normalize":
        pipeline.normalize();
        break;
      case "median":
        // Noise reduction
        pipeline.median(parseInt(value) || 3);
        break;
      default:
        return res.status(400).json({ error: "Invalid effect specified" });
    }

    const processedImage = await pipeline
      .toFormat(metadata.format, FORMAT_OPTIONS[metadata.format] || {})
      .toBuffer();

    res.type(`image/${metadata.format}`).send(processedImage);
  } catch (err) {
    console.error("Error processing image:", err);
    res.status(500).json({ error: err.message || "Image processing failed" });
  }
});

app.post(
  "/composite",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "overlay", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files?.image?.[0]) {
        return res.status(400).json({ error: "No base image provided" });
      }

      const { metadata, pipeline } = await validateAndProcessImage(
        req.files.image[0].buffer
      );

      if (req.files?.overlay?.[0]) {
        pipeline.composite([
          {
            input: req.files.overlay[0].buffer,
            gravity: "center",
          },
        ]);
      }

      const processedImage = await pipeline
        .toFormat(metadata.format, FORMAT_OPTIONS[metadata.format] || {})
        .toBuffer();

      res.type(`image/${metadata.format}`).send(processedImage);
    } catch (err) {
      console.error("Error processing image:", err);
      res.status(500).json({ error: err.message || "Image processing failed" });
    }
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Supported formats:", ALLOWED_FORMATS);
  console.log("Format options:", FORMAT_OPTIONS);
});
