import fs from 'fs'
import imagekit from '../config/imagekit.js';
import Story from '../models/Story.js';
import User from '../models/user.js';
import { inngest } from '../inngest/index.js';

//here we are using filestream but it is not suitable for vercel deployment so if error throw update it with memorystorage

//Add User Story
export const addUserStory = async(req,res) => {
    try {
        const {userId} = req.auth();
        const {content, media_type, background_color} = req.body;
        const media = req.file
        console.log('This is media from backend ', media)
        let media_url = ''

        //upload media to imagekit
        if((media_type === 'image' || media_type === 'video') && media) {
            const fileBuffer = media.buffer
            const response = await imagekit.files.upload({
                file: fileBuffer,
                fileName: media.originalname,
            })
            media_url = response.url
        }

        //create Story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color
        })

        //schedule story deletion after 24 hours
        await inngest.send({
            name: 'app/story.delete',
            data: {storyId: story._id}
        })

        res.json({success: true})
    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

//get User Stories
export const getUserStories = async(req,res) => {
    try {
        const {userId} = req.auth();
        const user = await User.findById(userId)

        //user connections and followings
        const userIds = [userId, ...user.connections, ...user.following]
        const stories = await Story.find({
            user: {$in: userIds}
        }).populate('user').sort({createdAt: -1});

        res.json({success: true, stories})

        //
    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}