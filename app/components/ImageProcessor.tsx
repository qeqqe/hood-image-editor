"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Upload,
  RotateCw,
  Maximize2,
  FileImage,
  Zap,
  Download,
  Droplets,
  Sun,
  Contrast,
  Moon,
  CircleDot,
  Palette,
} from "lucide-react";
import Tooltip from "./Tooltip";
import { throttle } from "lodash";

const FEATURES = {
  resize: {
    title: "Resize",
    description: "Change image dimensions while maintaining aspect ratio",
    icon: Maximize2,
  },
  convert: {
    title: "Convert",
    description: "Convert image to different formats (WebP, PNG, JPEG, AVIF)",
    icon: FileImage,
  },
  rotate: {
    title: "Rotate",
    description: "Rotate image by specific degrees",
    icon: RotateCw,
  },
  optimize: {
    title: "Optimize",
    description: "Compress image size while preserving quality",
    icon: Zap,
  },
  effects: {
    title: "Effects",
    description: "Apply various image effects",
    icon: Palette,
    options: [
      {
        name: "blur",
        label: "Blur",
        icon: Droplets,
        hasOptions: true,
        defaultValue: "5",
        min: "0",
        max: "20",
        step: "1",
      },
      {
        name: "sharpen",
        label: "Sharpen",
        icon: Sun,
        hasOptions: true,
        defaultValue: "5",
        min: "0",
        max: "20",
        step: "1",
      },
      {
        name: "modulate",
        label: "Color Adjust",
        icon: Palette,
        hasOptions: true,
        options: [
          {
            name: "brightness",
            label: "Brightness",
            default: "1",
            min: "0",
            max: "2",
            step: "0.1",
          },
          {
            name: "saturation",
            label: "Saturation",
            default: "1",
            min: "0",
            max: "3",
            step: "0.1",
          },
          {
            name: "hue",
            label: "Hue",
            default: "0",
            min: "0",
            max: "360",
            step: "10",
          },
        ],
      },
      { name: "grayscale", label: "B&W", icon: Moon },
      { name: "negate", label: "Invert", icon: Contrast },
      { name: "normalize", label: "Auto Fix", icon: CircleDot },
    ],
  },
};

export default function ImageProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [currentBuffer, setCurrentBuffer] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [format, setFormat] = useState("webp");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [angle, setAngle] = useState("0");
  const [activeEffect, setActiveEffect] = useState<string>("");
  const [effectOptions, setEffectOptions] = useState<Record<string, string>>(
    {}
  );

  const showNotification = (message: string, isError = false) => {
    alert(message);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);
    setCurrentBuffer(null);
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  interface ProcessData {
    format?: string;
    width?: string;
    height?: string;
    angle?: string;
    effect?: string;
    value?: string;
    [key: string]: string | undefined;
  }

  const handleProcess = async (endpoint: string, data: ProcessData = {}) => {
    if (!file && !currentBuffer) {
      showNotification("Please select an image first", true);
      return;
    }

    setProcessing(true);
    const formData = new FormData();

    try {
      if (endpoint === "convert") {
        formData.append("image", file as File);
        formData.append("format", data.format as string);

        const response = await axios.post(
          `http://localhost:3001/${endpoint}`,
          formData,
          {
            responseType: "blob",
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const processedBlob = new Blob([response.data], {
          type: `image/${data.format}`,
        });

        const url = URL.createObjectURL(processedBlob);

        const link = document.createElement("a");
        link.href = url;
        const filename = file?.name?.split(".")[0] || "converted";
        link.download = `${filename}.${data.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification(
          `Image converted to ${
            data.format?.toUpperCase() || "unknown format"
          } successfully`
        );
      } else {
        // Handle other operations as before
        formData.append("image", currentBuffer || (file as File));
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value.toString());
          }
        });

        const response = await axios.post(
          `http://localhost:3001/${endpoint}`,
          formData,
          {
            responseType: "blob",
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const processedBlob = new Blob([response.data], {
          type: file?.type || "image/jpeg",
        });

        setCurrentBuffer(processedBlob);
        const url = URL.createObjectURL(processedBlob);
        setPreview(url);
      }

      showNotification(`Image ${endpoint} successful`);
    } catch (error: any) {
      console.error(`${endpoint} error:`, error);
      showNotification(
        error.response?.data?.error || "Processing failed",
        true
      );
    } finally {
      setProcessing(false);
    }
  };

  const throttledProcess = useCallback(
    throttle((endpoint: string, data = {}) => {
      handleProcess(endpoint, data);
    }, 500),
    [handleProcess]
  );

  const handleDownload = useCallback(() => {
    if (!preview) return;

    const link = document.createElement("a");
    link.href = preview;
    link.download = `processed-${file?.name || "image"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [preview, file]);

  useEffect(() => {
    const handleScroll = throttle(() => {}, 100);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 relative">
      <motion.div
        {...getRootProps()}
        className="relative border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm rounded-xl p-10 cursor-pointer hover:border-zinc-700 transition-all shadow-lg hover:shadow-zinc-900/20 z-0"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <div className="relative group w-full">
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={preview}
                alt="Preview"
                className="max-h-[400px] w-full object-contain rounded-lg ring-1 ring-zinc-800"
              />
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="absolute bottom-4 right-4 p-2 bg-black/80 border border-zinc-700 rounded-lg text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                <Download className="w-5 h-5" />
              </motion.button>
            </div>
          ) : (
            <Tooltip text="Drop your image here or click to browse">
              <div className="text-center text-zinc-500">
                <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-light">
                  {isDragActive
                    ? "Release to drop"
                    : "Drop image here or click to upload"}
                </p>
                <p className="text-xs text-zinc-600 mt-2">
                  Supports PNG, JPEG, WebP, AVIF
                </p>
              </div>
            </Tooltip>
          )}
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Resize  */}
        <div className="feature-card">
          <div className="text-zinc-400 text-sm mb-4 font-medium">
            {FEATURES.resize.title}
          </div>
          <Tooltip text={FEATURES.resize.description}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="action-button"
              onClick={() => handleProcess("resize", { width, height })}
              disabled={processing}
            >
              <Maximize2 className="w-5 h-5 mx-auto" />
            </motion.button>
          </Tooltip>
          <div className="flex gap-3 w-full mt-4">
            <Tooltip text="Width in pixels">
              <input
                type="number"
                placeholder="Width"
                className="input-field"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </Tooltip>
            <Tooltip text="Height in pixels">
              <input
                type="number"
                placeholder="Height"
                className="input-field"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </Tooltip>
          </div>
        </div>

        {/* Convert   */}
        <div className="feature-card">
          <div className="text-zinc-400 text-sm mb-4 font-medium">
            {FEATURES.convert.title}
          </div>
          <Tooltip text={FEATURES.convert.description}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="action-button"
              onClick={() => handleProcess("convert", { format })}
              disabled={processing}
            >
              <FileImage className="w-5 h-5 mx-auto" />
            </motion.button>
          </Tooltip>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="input-field mt-4"
          >
            {["webp", "png", "jpeg", "avif", "gif"].map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Rotate */}
        <div className="feature-card">
          <div className="text-zinc-400 text-sm mb-4 font-medium">
            {FEATURES.rotate.title}
          </div>
          <Tooltip text={FEATURES.rotate.description}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="action-button"
              onClick={() => handleProcess("rotate", { angle })}
              disabled={processing}
            >
              <RotateCw className="w-5 h-5 mx-auto" />
            </motion.button>
          </Tooltip>
          <input
            type="number"
            placeholder="Degrees"
            className="input-field mt-4"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
          />
        </div>

        {/* Optimize */}
        <div className="feature-card">
          <div className="text-zinc-400 text-sm mb-4 font-medium">
            {FEATURES.optimize.title}
          </div>
          <Tooltip text={FEATURES.optimize.description}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="action-button"
              onClick={() => handleProcess("optimize")}
              disabled={processing}
            >
              <Zap className="w-5 h-5 mx-auto" />
            </motion.button>
          </Tooltip>
        </div>

        {/* Effects */}
        <div className="feature-card col-span-full">
          <div className="text-zinc-400 text-sm mb-4 font-medium">
            {FEATURES.effects.title}
          </div>
          <div className="grid grid-cols-5 gap-4">
            {FEATURES.effects.options.map((effect) => (
              <div key={effect.name} className="space-y-2">
                <Tooltip text={effect.label}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`action-button ${
                      activeEffect === effect.name ? "border-zinc-500" : ""
                    }`}
                    onClick={() => {
                      setActiveEffect(effect.name);
                      if (!effect.hasOptions) {
                        handleProcess("effects", {
                          effect: effect.name,
                          value: effect.defaultValue || "0",
                        });
                      }
                    }}
                    disabled={processing}
                  >
                    {effect.icon && <effect.icon className="w-5 h-5 mx-auto" />}
                  </motion.button>
                </Tooltip>
                {activeEffect === effect.name && effect.hasOptions && (
                  <div className="mt-2">
                    {effect.name === "modulate" ? (
                      <div className="space-y-2">
                        {effect.options?.map((opt) => (
                          <div key={opt.name} className="space-y-1">
                            <label className="text-xs text-zinc-500">
                              {opt.label}
                            </label>
                            <input
                              type="range"
                              min={opt.min}
                              max={opt.max}
                              step={opt.step}
                              value={effectOptions[opt.name] || opt.default}
                              onChange={(e) => {
                                const newOptions = {
                                  ...effectOptions,
                                  [opt.name]: e.target.value,
                                };
                                setEffectOptions(newOptions);
                                throttledProcess("effects", {
                                  effect: effect.name,
                                  ...newOptions,
                                });
                              }}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="range"
                        min={effect.min}
                        max={effect.max}
                        step={effect.step}
                        value={
                          effectOptions[effect.name] || effect.defaultValue
                        }
                        onChange={(e) => {
                          setEffectOptions({
                            ...effectOptions,
                            [effect.name]: e.target.value,
                          });
                          throttledProcess("effects", {
                            effect: effect.name,
                            value: e.target.value,
                          });
                        }}
                        className="w-full"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {processing && (
        <div className="fixed inset-0 w-full min-h-[100vh] bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] overflow-hidden">
          <div className="text-zinc-200 text-sm bg-black/20 px-4 py-2 rounded-lg backdrop-blur-md">
            Processing...
          </div>
        </div>
      )}
    </div>
  );
}
