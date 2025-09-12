"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

function App() {
  const [isSecondPanelOpen, setIsSecondPanelOpen] = useState(false);

  const toggleSecondPanel = () => {
    setIsSecondPanelOpen(!isSecondPanelOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          className="flex w-full overflow-hidden rounded-xl bg-white shadow-lg"
          layout
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <motion.div
            className="h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 p-8"
            layout
            // style={{ width: isSecondPanelOpen ? "calc(100% - 500px)" : "100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">
                Main Panel
              </h2>
              <motion.button
                onClick={toggleSecondPanel}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSecondPanelOpen ? (
                  <>
                    <X size={20} />
                    Close Panel
                  </>
                ) : (
                  <>
                    <Menu size={20} />
                    Open Panel
                  </>
                )}
              </motion.button>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-lg font-medium text-gray-800">
                  Content Area
                </h3>
                <p className="text-gray-600">
                  This main panel automatically resizes when the sidebar opens.
                  The width adjusts smoothly using Framer Motion's layout
                  animations.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-lg font-medium text-gray-800">
                  Features
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                    Smooth width transitions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                    Automatic layout adjustments
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                    Responsive design
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {isSecondPanelOpen && (
              <motion.div
                className="h-screen border-l border-gray-200 bg-gradient-to-br from-purple-50 to-pink-100"
                initial={{ width: 0, opacity: 0, padding: 0 }}
                animate={{ width: 500, opacity: 1, padding: 8 }}
                exit={{ width: 0, opacity: 0, padding: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="h-full overflow-y-auto">
                  <h2 className="mb-6 text-2xl font-semibold text-gray-800">
                    Sidebar Panel
                  </h2>

                  <div className="space-y-6">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                      <h3 className="mb-3 text-lg font-medium text-gray-800">
                        Settings
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Dark Mode</span>
                          <div className="h-6 w-11 rounded-full bg-gray-200"></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Notifications</span>
                          <div className="h-6 w-11 rounded-full bg-indigo-600"></div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                      <h3 className="mb-3 text-lg font-medium text-gray-800">
                        Quick Actions
                      </h3>
                      <div className="space-y-2">
                        <button className="w-full rounded-md bg-purple-100 px-4 py-2 text-left text-purple-800 hover:bg-purple-200">
                          Export Data
                        </button>
                        <button className="w-full rounded-md bg-purple-100 px-4 py-2 text-left text-purple-800 hover:bg-purple-200">
                          Import Settings
                        </button>
                        <button className="w-full rounded-md bg-purple-100 px-4 py-2 text-left text-purple-800 hover:bg-purple-200">
                          Reset Preferences
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
