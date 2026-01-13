import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Economy from './pages/Economy';
import Games from './pages/Games';
import RedRoom from './pages/RedRoom';
import Organizer from './pages/Organizer';
import { TelegramAuthProvider } from './features/auth/TelegramAuth';

import Chat from './features/chat/Chat';

function App() {
  return (
    <TelegramAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="economy" element={<Economy />} />
            <Route path="chat" element={<Chat />} />
            <Route path="games" element={<Games />} />
            <Route path="red-room" element={<RedRoom />} />
            <Route path="organizer" element={<Organizer />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TelegramAuthProvider>
  );
}

export default App;
