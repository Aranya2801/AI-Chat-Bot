import { useState } from "react";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SettingsModal from "./components/SettingsModal";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import "highlight.js/styles/github-dark.css";
import "./styles/globals.css";

export default function App() {
  // start closed on phones, otherwise the sidebar covers the whole chat
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <ThemeProvider>
      <ChatProvider>
        <div className="app-container">
          <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} onOpenSettings={() => setSettingsOpen(true)} />
          <div className="main-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
            <ChatWindow />
          </div>
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
}
