"use client";

import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex min-h-[500px] flex-col items-center justify-center px-4 py-16 text-center"
    >
      <motion.div variants={itemVariants} className="mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50">
          <Sparkles className="h-4 w-4 text-blue-600" />
          NIRF Analytics Platform
        </span>
      </motion.div>

      <motion.h1
        variants={itemVariants}
        className="mb-6 text-5xl font-extrabold tracking-tight text-gray-900 md:text-7xl"
      >
        Institutional
        <br />
        <span className="bg-gradient-to-r from-blue-700 to-blue-400 bg-clip-text text-transparent">
          Excellence & Insights
        </span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="mb-8 max-w-2xl text-lg text-gray-600 leading-relaxed"
      >
        Track, analyze, and benchmark performance across multiple parameters. Make data-driven decisions to improve your institution's NIRF ranking.
      </motion.p>

      <motion.div variants={itemVariants} className="flex gap-4">
        <Button size="lg" className="gap-2 bg-blue-600 text-white shadow-md hover:bg-blue-700">
          Explore Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" className="border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50">
          View Reports
        </Button>
      </motion.div>

     
    </motion.div>
  );
}
