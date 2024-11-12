"use client";
import { motion } from "framer-motion";
import ImageProcessor from "./components/ImageProcessor";

export default function Home() {
  return (
    <main className="container mx-auto py-16 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl  text-center mb-16 text-transparent bg-gradient-to-l from-red-400 to-blue-700 bg-clip-text font-bold tracking-tight"
      >
        Hood Studio
      </motion.h1>
      <ImageProcessor />
    </main>
  );
}
