import express from 'express'
import { protect } from '../middleware/auth.js';
import { acceptConnectionRequest, discoverUser, followUser, getUserConnections, getUserData, getUserProfiles, sendConnectionRequest, unfollowUser, updateUserData } from '../controllers/userController.js';
import  upload  from '../config/multer.js';
import { getUserRecentMessage } from '../controllers/messageController.js';

const userRouter = express.Router();

//api endpoints

userRouter.get('/data', protect, getUserData)

userRouter.post('/update', protect, upload.fields([{name: 'profile', maxCount: 1}, {name: 'cover', maxCount: 1}]),
 updateUserData)

userRouter.post('/discover', protect, discoverUser)

userRouter.post('/follow', protect, followUser)

userRouter.post('/unfollow', protect, unfollowUser)

userRouter.post('/connect', protect, sendConnectionRequest)

userRouter.post('/accept', protect, acceptConnectionRequest)

userRouter.get('/connections', protect, getUserConnections)

userRouter.post('/profiles', getUserProfiles)

userRouter.get('/recent-messages', protect, getUserRecentMessage)

export default userRouter
