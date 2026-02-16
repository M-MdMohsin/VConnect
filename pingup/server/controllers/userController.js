
import imageKit from "../config/imageKit.js"
import User from "../models/user.js"
import fs from 'fs'


// Get user data using userId
export const getUserData = async (req, res) => {
    try {
        const {userId} = req.auth()
        const user = await User.findById(userId)
        if(!user) {
            return res.json({success: false, message: "not not found"})
        }
        res.json({success: true, user})
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

// update user data
export const updateUserData = async (req, res) => {
    try {
        const {userId} = req.auth()
        let {username, bio, location, full_name} = req.body;

        const tempUser = await User.findById(userId)

        !username && (username = tempUser.user_name)

        if(tempUser.user_name !== username) {
            const user = User.findOne({username})
            if(user) {
                // we will not change if it is already taken
                username = tempUser.user_name
            }
        }
        const updatedData = {
            username, 
            bio, 
            location, 
            full_name
        }

        const profile = req.files.profile && req.files.profile[0]
        const cover = req.files.cover && req.files.cover[0]

        // for image upload using imagekit
        if(profile) {
            const buffer = fs.createReadStream(profile.path)
            const response = await imageKit.files.upload({
                file: buffer,
                fileName: profile.originalname,
            })
            const url = `${response.url}?tr=w-512,q-auto,f-webp`;
            updatedData.profile_picture = url;
        }

        // for cover photo using imagekit
        if(cover) {
            const buffer = fs.createReadStream(cover.path)
            
            const response = await imageKit.files.upload({
                file: buffer,
                fileName: profile.originalname,
            })
            const url = `${response.url}?tr=w-512,q-auto,f-webp`;
            updatedData.cover_photo = url;
        }
        // Update query
        const user = await User.findByIdAndUpdate(userId, updatedData, {new : true})

        res.json({success: true, user, message: 'Profile updated successfully'})
        
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

// Find user using username, email, location, name
export const discoverUser = async (req, res) => {
    try {
        const {userId} = req.auth()
        const {input} = req.body;

        const allUsers = await User.find(
            {   
                $or: [
                    {username: new RegExp(input, 'i')},
                    {email: new RegExp(input, 'i')},
                    {full_name: new RegExp(input, 'i')},
                    {location: new RegExp(input, 'i')},
                ]
            }
        )
        const filteredUsers = allUsers.filter(user=> user._id !== userId);

        res.json({success: true, users: filteredUsers})
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

//Follow user
export const followUser = async (req, res) => {
    try {
        const {userId} = req.auth()
        const {id} = req.body;

        const user = await User.findById(userId)

        if(user.following.includes(id)) {
            return res.json({success: false, message: 'You are already following this user'})
        }
        
        user.following.push(id);
        await user.save()

        const toUser = await User.findById(id)
        toUser.followers.push(userId)
        await toUser.save()

        res.json({success: true, message: 'Now you are following this user'})

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

//Unfollow User
export const unfollowUser = async (req, res) => {
    try {
        const {userId} = req.auth()
        const {id} = req.body;

        const user = await User.findById(userId)

       user.following = useruser.following.filter(user=> user !== id);
       await user.save()

       const toUser = await User.findById(id)
        toUser.followers = toUser.followers.filter(user=> user !== userId);
        await toUser.save()

        res.json({success: true, message: 'You are no longer following this user'})

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}