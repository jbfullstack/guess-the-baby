import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', ...props }) => (
  <motion.div
    className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    {...props}
  >
    {children}
  </motion.div>
);

export default Card;