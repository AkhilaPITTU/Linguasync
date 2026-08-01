import { useState } from 'react'
import Profile from './pages/profile'
import Setting from './pages/setting'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('profile')

  return (
    <div className="app">
      <nav className="nav-bar">
        <button 
          className={currentPage === 'profile' ? 'active' : ''} 
          onClick={() => setCurrentPage('profile')}
        >
          Profile
        </button>
        <button 
          className={currentPage === 'setting' ? 'active' : ''} 
          onClick={() => setCurrentPage('setting')}
        >
          Setting
        </button>
      </nav>
      <main>
        {currentPage === 'profile' && <Profile />}
        {currentPage === 'setting' && <Setting />}
      </main>
    </div>
  )
}

export default App
