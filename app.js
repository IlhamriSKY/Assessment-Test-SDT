const express = require('express');
const functions = require('./controller');
const routes = require('./route');

const app = express();

app.use(express.json());
app.use('/', routes);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        await functions.recoverAndResendMessages();
    } catch (error) {
        console.error('Error during startup recovery:', error.message);
    }
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    server.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    server.close(() => {
        process.exit(1);
    });
});

setInterval(async () => {
    try {
        await functions.checkAndSendBirthdayMessages();
    } catch (error) {
        console.error('Error in checking and sending birthday messages:', error.message);
    }
}, 10 * 1000); // Check every minute