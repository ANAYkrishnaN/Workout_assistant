/* eslint-disable react-hooks/static-components */
import { Calendar, Camera, Droplets, Dumbbell, Home, LogOut, MessageCircle, Settings, Drumstick } from "lucide-react";
import { useRouter } from "next/router";
import React from "react";
import { motion } from "framer-motion";

const Sidebar = ({ activeTab, sidebarOpen, setActiveTab, setSidebarOpen }) => {
  const router = useRouter();

  const NavigationItem = ({ icon: Icon, label, value, active }) => (
    <motion.button
      onClick={() => {
        setActiveTab(value);
        setSidebarOpen(false);
      }}
      className={`relative w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-[background-color,box-shadow] duration-300 ease-out ${active
        ? "text-white"
        : "text-gray-600 hover:bg-gray-100 hover:shadow-[0_0_14px_rgba(6,182,212,0.15)] active:scale-[0.99]"
        }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm"
          layoutId="sidebar-active"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{ boxShadow: "0 0 12px rgba(6, 182, 212, 0.4)" }}
        />
      )}
      <span className="relative z-10 flex items-center space-x-3">
        <motion.span
          className="flex-shrink-0"
          whileHover={active ? {} : { rotate: 8 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-5 h-5" />
        </motion.span>
        <span className="font-medium">{label}</span>
      </span>
    </motion.button>
  );

  return (
  <aside
    className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
  >
    <div className="p-6">
      {/* Logo */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-linear-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">FitTrack</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        <NavigationItem
          icon={Home}
          label="Dashboard"
          value="dashboard"
          active={activeTab === "dashboard"}
        />
        <NavigationItem
          icon={Dumbbell}
          label="Workouts"
          value="workouts"
          active={activeTab === "workouts"}
        />
        <NavigationItem
          icon={Droplets}
          label="Hydration"
          value="hydration"
          active={activeTab === "hydration"}
        />
        <NavigationItem
          icon={Camera}
          label="Posture Tracker"
          value="camera"
          active={activeTab === "camera"}
        />
        <NavigationItem
          icon={MessageCircle}
          label="AI Assistant"
          value="chat"
          active={activeTab === "chat"}
        />
        <NavigationItem
          icon={Drumstick}
          label="Diet Planner"
          value="dietPlanner"
          active={activeTab === "dietPlanner"} />
        {/* <NavigationItem
          icon={Calendar}
          label="Schedule"
          value="schedule"
          active={activeTab === "schedule"}
        /> */}
      </nav>

      {/* Bottom Navigation */}
      <div className="absolute bottom-6 left-6 right-6 space-y-2 border-t pt-4">
        <NavigationItem
          icon={Settings}
          label="Settings"
          value="settings"
          active={activeTab === "settings"}
        />
        <button onClick={() => router.push("/")} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors duration-200 cursor-pointer active:scale-[0.99]">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  </aside>
  );
};

export default Sidebar;
