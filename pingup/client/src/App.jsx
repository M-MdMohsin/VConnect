import React, { useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
import ChatBox from './pages/ChatBox'
import Connections from './pages/Connections'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import CreatePost from './pages/CreatePost'
import { useUser, useAuth } from '@clerk/clerk-react'
import Layout from './pages/Layout'
import {Toaster} from 'react-hot-toast'
import { useEffect } from 'react'
import { fetchUser } from './features/user/userSlice.js'
import { useDispatch } from 'react-redux'
import { fetchConnections } from './features/connections/connectionSlice.js'
import { addMessage } from './features/messages/messagesSlice.js'

const App = () => {
  const {user} = useUser() 
  const {getToken} = useAuth()
  const dispatch = useDispatch()
  const {pathname} = useLocation()
  const pathnameRef = useRef(pathname)

  useEffect(()=> {

    const fetchData = async () => {
      if(user) {
        const token = await getToken()
        dispatch(fetchUser(token))
        dispatch(fetchConnections(token))
      }
    };
    fetchData();
  },[user, getToken, dispatch])

  useEffect(()=>{
    pathnameRef.current = pathname
  },[pathname])

  useEffect(()=>{
    if(user) {
      const eventSource = new EventSource(import.meta.env.VITE_BASEURL + '/api/message/' + user.id);

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data)

        if(pathnameRef.current === ('/messages/' + message.from_user_id._id)) {
          dispatch(addMessage(message))
        }else {

        }
      }
      return ()=> {
        eventSource.close()
      }
    }
  },[user, dispatch])


  return (
    <>
      <Toaster/>
      <Routes>
        <Route path="/login" element={<Login />} />
  
        <Route
          path="/"
          element={!user ? <Login /> : <Layout/>}
        >
          <Route index element={<Feed/>}/>
          
          <Route path='messages' element={<Messages/>}/>
          <Route path='messages/:userId' element={<ChatBox/>}/>         // this is because the chatbox component require userid to access
          <Route path='connections' element={<Connections/>}/>
          <Route path='discover' element={<Discover/>}/>
          <Route path='profile' element={<Profile/>}/>
          <Route path='profile/:profileId' element={<Profile/>}/>
          <Route path='create-post' element={<CreatePost/>}/>
        </Route>
      </Routes>
    
    </>
  )
}

export default App