const express = require('express');
const Joi = require('joi');
const functions = require('./functions');

const app = express();

app.use(express.json());

// API to check running services
app.get('/test', async (req, res) => {
    res.send('Service Is Running');
});

app.get('/test/:city', async (req, res) => {
    const city = req.params.city;
    const userTimezone = await functions.getTimeZoneByCity(city);
    res.send(userTimezone[0].timezone);
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
            city: Joi.string().required(),
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

// Function to Recovery Seending Message
async function recoverAndResendMessages() {
    try {
        const unsentUsers = await functions.fetchUsersWithUnsentMessages();
        for (const user of unsentUsers) {
            await functions.sendBirthdayMessage(user, process.env.HOUR_SEND);
        }
    } catch (error) {
        console.error('Error recovering and resending messages:', error.message);
    }
}

// Start server and perform recovery routine
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        // Attempt to recover and resend unsent messages
        await recoverAndResendMessages();
    } catch (error) {
        console.error('Error during startup recovery:', error.message);
    }
});


// Handle unhandled promise rejections or exceptions
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    // Close server and exit process on unhandled rejection
    server.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Close server and exit process on uncaught exception
    server.close(() => {
        process.exit(1);
    });
});

// Periodically check and send birthday messages for active users every minute
setInterval(async () => {
    try {
        await functions.checkAndSendBirthdayMessages();
    } catch (error) {
        console.error('Error in checking and sending birthday messages:', error.message);
    }
}, 10 * 1000); // Check every minute