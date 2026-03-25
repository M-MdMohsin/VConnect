import fs from 'fs'
import imagekit from '../config/imagekit.js';
import { connections } from "mongoose";
import Message from '../models/Message.js';

//create an empty object to store server side event connection
const connection = {};

//controller functio for SSE endpoint
export const sseController = (req, res) => {
    const {userId} = req.params
    console.log('New Client connected : ', userId);

    //Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    //Add the client response object to the connection object
    connections[userId] = res

    //send an initial event to the client
    res.write('log: Connection to SSE stream\n\n')

    // handle client disconnection
    req.on('close', ()=> {
        //Remove the client response object from the connections array
        delete connections[userId];
        console.log('Client disconnected');
    })
}

//Send Message
export const sendMessage = async (req, res) => {
    try {
        const {userId} = req.auth();
        const {to_user_id, text} = req.body;
        const image = req.file;

        let media_url = '';
        let message_type = image ? 'image' : 'text';

        if(message_type == 'image') {
            const response = await imagekit.files.upload({
                file: image.buffer.toString("base64"),
                fileName: image.originalname,
            });
            media_url = response.url
        }
        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url 
        })

        res.json({success: true, message});

        // ..send message to to_user_id using sse
        const messageWithUserData = await Message.findById(message._id).populate('from_user_id');

        if(connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`)
        }

    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message});
    }
}

//Get Chat Messages
export const getChatMessages = async (req,res) => {
    try {
        const {userId} = req.auth()
        const {to_user_id} = req.body

        const messages = await Message.find({
            $or: [
                {from_user_id: userId, to_user_id},
                {from_user_id: to_user_id, to_user_id: userId},
            ]
        }).sort({created_at: -1})
        //mark messages as seen
        await Message.updateMany({from_user_id: to_user_id, to_user_id: userId}, {seen: true})

        res.json({success: true, messages});

    } catch (error) {
        res.json({success: false, message: error.message});
       
    }
}


export const getUserRecentMessage = async (req,res) => {
    try {
        const {userId} = req.auth();
        const messages = await Message.find({to_user_id: userId}.populate('from_user_id  to_user_id')).sort({
            created_at: -1
        });

        res.json({success: true, messages})
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}
