const express = require('express');
const Joi = require('joi');
const functions = require('./functions');

const app = express();

app.use(express.json());

// API to check running services
app.get('/test', (req, res) => {
    res.send('Service is running');
});

// API to create a new user
app.post('/user', async (req, res) => {
    try {
        const userData = req.body;
        // Validate
        const schema = Joi.object({
            first_name: Joi.string().required(),
            last_name: Joi.string().required(),
            email: Joi.string().email().required(),
            birthday: Joi.date().iso().required(),
            location: Joi.string().required(),
            status: Joi.string().valid('active', 'inactive').required()
        });
        const { error } = schema.validate(userData);
        if (error) {
            return res.status(400).send(error.details[0].message);
        }

        // Create User
        const result = await functions.createUser(userData);
        res.status(201).send('User created successfully');
    } catch (err) {
        res.status(500).send('Error creating user: ' + err.message);
    }
});

// API to Get All Users
app.get('/users', async (req, res) => {
    try {
        const users = await functions.getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).send('Error fetching users: ' + err.message);
    }
});

// API to update a user
app.put('/user/:id', async (req, res) => {
    const userId = req.params.id;
    const updatedFields = req.body;

    try {
        if (!userId || userId.trim() === '') {
            return res.status(400).send('Invalid user ID');
        }

        const userExists = await functions.checkUserExists(userId);
        if (!userExists) {
            return res.status(404).send('User not found');
        }

        const result = await functions.editUser(userId, updatedFields);
        res.status(200).send('User updated successfully');
    } catch (err) {
        res.status(500).send('Error updating user: ' + err.message);
    }
});

// API to delete a user
app.delete('/user/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        if (!userId || userId.trim() === '') {
            return res.status(400).send('Invalid user ID');
        }

        const userExists = await functions.checkUserExists(userId);
        if (!userExists) {
            return res.status(404).send('User not found');
        }

        const result = await functions.deleteUser(userId);
        res.status(200).send('User deleted successfully');
    } catch (err) {
        res.status(500).send('Error deleted user: ' + err.message);
    }
});

// API to send email
app.post('/send-email', async (req, res) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            subject: Joi.string().required(),
            message: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).send(error.details[0].message);
        }

        const user = {
            email: value.email,
            first_name: value.first_name,
            last_name: value.last_name
        };
        const messageContent = value.message;
        const subject = value.subject;

        await functions.sendMessage(user, messageContent, subject);
        res.send('Test email sent');
    } catch (error) {
        res.status(500).send('Error sending email: ' + error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Periodically check and send birthday messages for active users every minute
setInterval(async () => {
    try {
        await functions.checkAndSendBirthdayMessages();
    } catch (error) {
        console.error('Error in checking and sending birthday messages:', error.message);
    }
}, 60 * 1000); // Check every minute