import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/axios'

const initialState = {
    messages: []
}

export const fetchMessages  = createAsyncThunk('messages/fetchMessages', async ({token, userId})=> {
    const { data } = await api.post('/api/messages/get', {to_user_id: userId}, {
        headers: {Authorization: `Bearer ${await getToken()}`}
    })
    return data.success ? data : null
})

const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setMessages : (state, action)=> {
            state.messages = action.payload;
        },
        addMessage: (state, action ) => {
            state.messages = [...state.messages, action.payload];
        },
        resetMessages : (state)=> {
            state.messages = [];
        },
    },
    extraReducers: (builder)=> {
        builder.addCase(fetchMessages.fulfilled, (state, action)=> {
            if(action.payload) {
                state.messages = action.payload;
            }
        })
    }
})

export default messagesSlice.reducer