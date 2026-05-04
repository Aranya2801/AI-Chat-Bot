import { useState, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/globals.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ThemeProvider>
      <ChatProvider>
        <div className="app-container">
          <Header onToggleSidebar={() => setSidebarOpen((p) => !p)} />
          <div className="main-layout">
            <Sidebar isOpen={sidebarOpen} />
            <ChatWindow />
          </div>
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
}
