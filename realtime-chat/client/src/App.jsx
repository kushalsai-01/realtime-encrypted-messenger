import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import HomeScreen from './components/HomeScreen'
import WaitingScreen from './components/WaitingScreen'
import ChatRoom from './components/ChatRoom'

const SESSION_USER_ID =
  sessionStorage.getItem('userId') ||
  (() => {
    const id = uuidv4()
    sessionStorage.setItem('userId', id)
    return id
  })()

export default function App() {
  const [screen, setScreen] = useState('home')
  const [roomCode, setRoomCode] = useState(null)
  const [isCreator, setIsCreator] = useState(false)

  const handleRoomCreated = useCallback((code) => {
    setRoomCode(code)
    setIsCreator(true)
    setScreen('waiting')
  }, [])

  const handleRoomJoined = useCallback((code) => {
    setRoomCode(code)
    setIsCreator(false)
    setScreen('chat')
  }, [])

  const handlePeerJoined = useCallback(() => {
    setScreen('chat')
  }, [])

  const handleLeave = useCallback(() => {
    setRoomCode(null)
    setIsCreator(false)
    setScreen('home')
  }, [])

  if (screen === 'home')
    return (
      <HomeScreen userId={SESSION_USER_ID} onRoomCreated={handleRoomCreated} onRoomJoined={handleRoomJoined} />
    )

  if (screen === 'waiting')
    return (
      <WaitingScreen
        roomCode={roomCode}
        userId={SESSION_USER_ID}
        isCreator={isCreator}
        onPeerJoined={handlePeerJoined}
        onLeave={handleLeave}
      />
    )

  return <ChatRoom roomCode={roomCode} userId={SESSION_USER_ID} onLeave={handleLeave} />
}
