import express from 'express'
import upload from '../config/multer.js'
import { protect } from '../middleware/auth.js'
import { addUserStory, getUserStories } from '../controllers/storyController.js'


const storyRouter = express.Router()

storyRouter.post('/create', upload.single('media'), protect, addUserStory)
storyRouter.get('/get', protect, getUserStories)

export default storyRouter