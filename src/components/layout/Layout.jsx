import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useSurveillance } from '../../contexts/SurveillanceContext';
import { ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { recentNotification, clearNotification } = useSurveillance();

  return (
    <div className="min-h-screen bg-[#070b12] flex text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />

        {/* Global Floating Alert Banner Toast */}
        <AnimatePresence>
          {recentNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-16 z-20 px-4 py-2"
            >
              <div className="max-w-7xl mx-auto p-3 rounded-xl bg-red-950/90 border border-red-500/60 shadow-glow-red flex items-center justify-between gap-3 text-red-200 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-xs text-white uppercase tracking-wider block">
                      {recentNotification.title}
                    </span>
                    <span className="text-xs text-red-300 font-mono">
                      {recentNotification.message}
                    </span>
                  </div>
                </div>

                <button
                  onClick={clearNotification}
                  className="p-1 rounded hover:bg-red-900/50 text-red-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
