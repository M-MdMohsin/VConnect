import User from "../models/user.js"


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
        const {username, bio, location, full_name} = req.body;

        const tempUser = await User.findById(userId)

        !username && (username = tempUser.user_name)

        if(tempUser.user_name !== username) {
            const user = User.findOne({username})
            if(user) {
                // we will not change if it is already taken
                username = tempUser.user_name
            }
        }
        const updateData = {
            username, 
            bio, 
            location, 
            full_name
        }

        const profile = req.files.profile && req.files.profile[0]
        const cover = req.files.cover && req.files.cover[0]
        
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}