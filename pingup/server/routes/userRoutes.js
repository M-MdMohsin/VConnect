import express from 'express'
import { protect } from '../middleware/auth.js';
import { discoverUser, followUser, getUserData, unfollowUser, updateUserData } from '../controllers/userController.js';
import { upload } from '../config/multer.js';

const userRouter = express.Router();

//api endpoints

userRouter.get('/data', protect, getUserData)

userRouter.post('/update', upload.fields([{name: 'profile', maxCount: 1}, {name: 'cover', maxCount: 1}]),
protect, updateUserData)

userRouter.post('discover', protect, discoverUser)

userRouter.post('/follow', protect, followUser)

userRouter.post('/unfollow', protect, unfollowUser)

export default userRouter
