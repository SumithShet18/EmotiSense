import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            className="max-w-container mx-auto px-4 sm:px-6 py-10"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-border py-8">
        <div className="max-w-container mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">&copy; 2026 EmotiSense &middot; Multimodal Emotion Intelligence</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Research demo &middot; Not a substitute for professional medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
