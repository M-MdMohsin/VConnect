import { Inngest } from "inngest";
import User from "../models/user";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });

// Injest Function to save user data to database
const syncUserCreation = inject.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ({event})=> {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        let username = email_addresses[0].email_addresses.split('@')[0]

        // Check availability of username
        const user = await User.findOne({username})

        if (user) {
            username = username + Math.floor(Math.random() * 10000)
        }

        const userData = {
            _id: id,
            email: email_addresses[0].email_addresses,
            full_name: first_name + " " + last_name,
            profile_picture: image_url,
            username
        }
        await User.create(userData)

    }
)

// ingest function to update user data in database
const syncUserUpdation = inject.createFunction(
    {id: 'update-user-from-clerk'},
    {event: 'clerk/user.update'},
    async ({event})=> {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        
        const updatedUserData = {
            email: email_addresses[0].email_addresses,
            full_name: first_name + ' ' + last_name,
            profile_picture: image_url
        }
        await User.findByIdAndUpdate(id, updatedUserData)
    }
)

// ingest function to delete user data in database
const syncUserDeletion = inject.createFunction(
    {id: 'delete-user-from-clerk'},
    {event: 'clerk/user.delete'},
    async ({event})=> {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        await User.findByIdAndDelete(id)
        
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
];