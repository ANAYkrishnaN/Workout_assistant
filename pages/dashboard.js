import React, { useEffect, useState } from "react";
import {
  User,
  Menu,
  X
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import HomeComponent from "../components/modules/HomeComponent";
import Posture from "@/components/modules/Posture";
import Chatbot from "@/components/modules/Chatbot";
import { useRouter } from "next/router";
import Hydration from "@/components/modules/Hydration";
import Workout from "@/components/modules/Workout";
import DietPlanner from "@/components/modules/DietPlanner";

export default function WorkoutDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [firstName, setFirstName] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = localStorage.getItem("user");

        // Check if user data exists and is valid
        if (!storedUser || storedUser === 'undefined' || storedUser === 'null') {
          console.error('No valid user data found');
          router.push('/');
          return;
        }

        try {
          const userData = JSON.parse(storedUser);

          if (!userData || !userData._id) {
            console.error('Invalid user data structure');
            router.push('/');
            return;
          }

          setUser(userData);
          setFirstName(userData?.login?.fullName?.split(" ")[0] || "User");

          // Optionally fetch fresh data from API
          const res = await fetch(`/api/users/me?userId=${userData._id}`);
          const data = await res.json();

          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            setFirstName(data.user?.login?.fullName?.split(" ")[0] || "User");
          }
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          localStorage.removeItem('user');
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/');
      }
    };

    fetchUserData();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-200 border-t-cyan-500" style={{ animationDuration: "0.8s" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Sidebar
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        setSidebarOpen={setSidebarOpen}
        setActiveTab={setActiveTab}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center transition-transform duration-200 active:scale-95 hover:shadow-xl"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className="w-5 h-5 transition-transform duration-200" /> : <Menu className="w-5 h-5 transition-transform duration-200" />}
      </button>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome, {firstName}
            </h2>
            <p className="text-gray-500 mt-1">
              Let&apos;s crush your fitness goals today 💪
            </p>
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ease-out"
          >
            <User className="w-6 h-6" />
          </button>
        </div>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <div className="animate-fade-in">
            <HomeComponent setActiveTab={setActiveTab} />
          </div>
        )}

        {/* Workouts Content */}
        {activeTab === "workouts" && (
          <div className="animate-fade-in">
            <Workout />
          </div>
        )}

        {/* Hydration Content */}
        {activeTab === "hydration" && (
          <div className="animate-fade-in">
            <Hydration />
          </div>
        )}

        {/* Camera/Posture Tracker Tab */}
        {activeTab === "camera" && (
          <div className="animate-fade-in">
            <Posture />
          </div>
        )}

        {/* Chat/AI Assistant Tab */}
        {activeTab === "chat" && (
          <div className="animate-fade-in">
            <Chatbot />
          </div>
        )}
        {/* Diet Planner Tab */}
        {activeTab === "dietPlanner" && (
          <div className="animate-fade-in">
            <DietPlanner />
          </div>
        )}

        {/* Other tabs placeholder */}
        {!["dashboard", "camera", "chat", "hydration", "workouts", "dietPlanner"].includes(activeTab) && (
          <div className="bg-white rounded-2xl p-8 shadow-lg animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
              {activeTab}
            </h3>
            <p className="text-gray-600">This section is coming soon!</p>
          </div>
        )}
      </main>
    </div>
  );
}