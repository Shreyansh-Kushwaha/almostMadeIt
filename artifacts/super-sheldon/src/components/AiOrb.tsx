import { motion } from "framer-motion";

interface AiOrbProps {
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
}

export default function AiOrb({ size = "md", isActive = true }: AiOrbProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-32 h-32"
  };

  const coreSize = sizeMap[size];

  if (!isActive) {
    return (
      <div className={`relative flex items-center justify-center ${coreSize}`}>
        <div className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30" />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${coreSize}`}>
      {/* Outer pulsing rings */}
      <motion.div
        className="absolute inset-[-50%] rounded-full border border-primary/30"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute inset-[-25%] rounded-full border border-primary/40"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
      
      {/* Core glowing sphere */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-orange-300 blur-[2px]"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          boxShadow: "0 0 20px 5px rgba(255, 122, 0, 0.5)",
        }}
      />
      <div className="absolute inset-[15%] rounded-full bg-white/20 blur-[1px]" />
    </div>
  );
}
