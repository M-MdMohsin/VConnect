import { Inngest, step } from "inngest";
import User from "../models/user.js";
import Connection from "../models/connection.js";
import sendEmail from "../config/nodemailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });

// Injest Function to save user data to database
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'user.created'},
    async ({event})=> {
        const {id, firstName, lastName, imageUrl} = event.data

        console.log("CLERK EVENT:", event.data.id)
        
        const email = event.data.primaryEmailAddress?.emailAddress
        console.log("email is ", email)

        if (!email) {
            console.log("Email not found")
            return
        }
        let username = email.split('@')[0]

        // Check availability of username
        // const user = await User.findOne({username})
 

        const existing = await User.findById(id);
        console.log("Existing user:", existing);
        if (existing) {
            console.log("User already exists, skipping...");
            return;
        }

        const userExists = await User.findOne({user_name : username})

        if (userExists) {
            username = username + Math.floor(Math.random() * 10000)
        }

        const userData = {
            _id: id,
            email,
            full_name: firstName + " " + lastName,
            profile_picture: imageUrl,
            user_name: username
        }
        try {
            await User.create(userData)
            console.log("User synced:", id)
        } catch (error) {
            console.log("DB ERROR:", error)
        }
    }
)

// ingest function to update user data in database
const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    {event: 'clerk/user.update'},
    async ({event})=> {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        
        const updatedUserData = {
            email: email_addresses[0].email_address,
            full_name: first_name + ' ' + last_name,
            profile_picture: image_url
        }
        await User.findByIdAndUpdate(id, updatedUserData)
    }
)

// ingest function to delete user data in database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-from-clerk'},
    {event: 'clerk/user.delete'},
    async ({event})=> {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        await User.findByIdAndDelete(id)
        
    }
)


// Ingest function to send reminder when a new connection request is added
const sendNewConnectionRequestReminder = inngest.createFunction(
    {id: "send-new-connection-request-reminder"},
    {event: "app/connection-request"},
    async ({event, step}) => {
        const {connectionId} = event.data;

        await step.run('send-connection-request-mail', async ()=> {
            const connection = await Connection.findById(connectionId).populate('fron_user_id to_user_id');
            const subject = `👋 New Connection Request`;
            const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Hi ${connection.to_user_id.full_name},</h2>
                            <p>You have a new connection request from ${connection.from_user_id.
                            full_name} - @${connection.from_user_id.username}</p>
                            <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept or reject the request</p>
                            <br/>
                            <p>Thanks,<br/>PingUp - Stay Connected</p>
                            </div>`;
            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                body
            })
        })

        // a reminder email if user has not check the status
        const in24Hours = new Date(Date.now() + 24 * 60 * 1000)
        await step.sleepUntil("wait-for-24-hours", in24Hours);
        await step.run('send-connection-request-reminder',async ()=> {
            const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id')
            if(connection.status === "accepted") {
                return {message: "Already Accepted"}
            }

            const subject = `👋 New Connection Request`;
            const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Hi ${connection.to_user_id.full_name},</h2>
                            <p>You have a new connection request from ${connection.from_user_id.
                            full_name} - @${connection.from_user_id.username}</p>
                            <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept or reject the request</p>
                            <br/>
                            <p>Thanks,<br/>PingUp - Stay Connected</p>
                            </div>`;
            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                body
            })

            await sendEmail ({
                to: connection.to_user_id.email,
                subject,
                body
            })

            return {message: "Reminder sent"}

        })
    }
)

//inngest Function to delete story after 24 hours
const deleteStory = inngest.createFunction(
    {id: 'story-delete'},
    {event: 'app/story.delete'},
    async ({event, step}) => {
        const {storyId} = event.data;
        const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await step.sleepUntil('wait-for-24-hours', in24Hours)
        await step.run("delete-story", async () => {
            await Story.findByIdAndDelete(storyId)
            return {message: "story deleted."}
        })
    }
)

const sendNotificationOfUnseenMessages = inngest.createFunction(
    {id: "send-unseen-messages-notification"},
    {cron: "TZ=America/New_York 0 9 * * *"}, //Every 9 AM
    async ({step}) => {
        const messages = await Message.find({seen: false}).populate('to_user_id');
        const unseenCount = {}

        messages.map(message=>{
            unseenCount[message.to_user_id._id] = (unseenCount[message.to_user_id._id] || 0) + 1;

        })

        for(const userId in unseenCount) {
            const user = await User.findById(userId);

            const subject = `You have ${unseenCount[userId]} unseen messages`;

            const body = `
            <div style="font-family: Ariel, sans-serif; padding: 20px;">
                <h2>Hi ${user.full_name},</h2>
                <p>you have ${unseenCount[userId]} unseen messages</p>
                <p>Click <a href= "${process.env.FRONTEND_URL}/messages" style="color: #10b981;">here</a> to view them</p>
                <br/>
                <p>Thanks, <br/>Pingup - Stay Connected</p>
            </div>`;

            await sendEmail({
                to: user.email,
                subject,
                body
            })
        }
        return {message: "Notification sent."}
    }
)


// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,
    sendNewConnectionRequestReminder,
    deleteStory,
    sendNotificationOfUnseenMessages
];