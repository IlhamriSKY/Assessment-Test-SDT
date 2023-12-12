const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const cityTimezones = require('city-timezones');
const { connection } = require('./config');

// Function to Create New User
async function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { first_name, last_name, email, birthday, city, status } = userData;
        const query = 'INSERT INTO users (first_name, last_name, email, birthday, city, status) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [first_name, last_name, email, birthday, city, status];

        connection.query(query, values, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Function to check if User Exists
async function checkUserExists(userId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id FROM users WHERE id = ?';
        connection.query(query, [userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.length > 0);
            }
        });
    });
}

// Function to Get All Users
async function getAllUsers() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id, first_name, last_name, email, birthday, city, status, message_sent_status, message_sent, created_at FROM users';
        connection.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Function to Edit User
async function editUser(userId, updatedFields) {
    return new Promise((resolve, reject) => {
        const fieldKeys = Object.keys(updatedFields);
        const fieldValues = fieldKeys.map(key => updatedFields[key]);

        let query = 'UPDATE users SET ';
        query += fieldKeys.map(key => `${key} = ?`).join(', ');
        query += ' WHERE id = ?';

        connection.query(query, [...fieldValues, userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Function to Delete User
async function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM users WHERE id = ?';
        connection.query(query, [userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Function to Send Email Message
async function sendMessage(user, messageContent, subject) {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.SMTP_SERVICE,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: user.email,
            subject: subject,
            text: messageContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return 'Email sent successfully';
    } catch (error) {
        console.log('Error sending email:', error);
        throw new Error('Failed to send email: ' + error.message);
    }
}

// Function to Recovery Seending Message
async function recoverAndResendMessages(messageType, sendTime) {
    try {
        const unsentUsers = await fetchUsersWithUnsentMessages();
        for (const user of unsentUsers) {
            await sendScheduleMessage(user, messageType, sendTime);
        }
    } catch (error) {
        console.error(`Error recovering and resending ${messageType} messages:`, error.message);
    }
}

// Function convert City into TimeZone
async function getTimeZoneByCity(cityName) {
    const cityLookup = cityTimezones.lookupViaCity(cityName)
    return cityLookup;
}

// Function to Send Messages
async function sendScheduleMessage(user, messageType, sendTime) {
    try {
        const now = moment.tz('Asia/Jakarta');
        console.log('Current time in Jakarta:', now.format('DD/MM/YYYY HH:mm:ss'));

        const userTimezone = await getTimeZoneByCity(user.city);
        const nowTimeZone = moment.tz(userTimezone[0].timezone);
        console.log('Current time by Time Zone:', nowTimeZone.format('DD/MM/YYYY HH:mm:ss'));

        const userDateTime = moment.tz(user[messageType], 'YYYY-MM-DD', 'UTC');
        const userTime = userDateTime.clone().tz(userTimezone[0].timezone);
        console.log('User datetime in user timezone:', userTime.format());

        // Set message sending time in user's local time zone
        userTime.hour(sendTime.hour).minute(sendTime.minute).second(sendTime.second);
        console.log('Scheduled sending time in user timezone:', userTime.format('DD/MM/YYYY HH:mm:ss'));
        
        if (
            now.isSame(userTime, 'day') &&
            now.isSameOrAfter(userTime) &&
            user.message_sent_status === 0
        ) {
            const transporter = nodemailer.createTransport({
                service: process.env.SMTP_SERVICE,
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            const mailOptions = {
                from: process.env.SMTP_FROM,
                to: user.email,
                subject: `Happy ${messageType.charAt(0).toUpperCase() + messageType.slice(1)}!`,
                text: `Hey, ${user.first_name} ${user.last_name}, it's your ${messageType}!`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);

            // Update respective message status
            await updateUserMessageStatus(user.id, `${messageType}_sent_status`);
        }
    } catch (error) {
        console.error(`Error sending ${messageType} message:`, error.message);
    }
}

// Function to Update Message Status
async function updateUserMessageStatus(userId) {
    try {
        await new Promise((resolve, reject) => {
            connection.query('UPDATE users SET message_sent_status = ?, message_sent = NOW() WHERE id = ?', [true, userId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error updating message_sent status:', error.message);
    }
}

// Function to Fetch Users with Unsents Messages
async function fetchUsersWithUnsentMessages() {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE message_sent_status = ?', [false], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Function to Check and Send Birthday Messages
async function checkAndSendMessages(messageType, sendTime) {
    const now = moment.tz('Asia/Jakarta');
    console.log(`Check ${messageType} ${now}`);
    try {
        const users = await fetchActiveUsers();
        for (const user of users) {
            await sendScheduleMessage(user, messageType, sendTime);
        }
    } catch (error) {
        console.error(`Error in checking and sending ${messageType} messages:`, error.message);
    }
}

// Function to Fetch Active Users
async function fetchActiveUsers() {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE status = ?', ['active'], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

module.exports = {
    createUser,
    checkUserExists,
    getAllUsers,
    editUser,
    deleteUser,
    sendMessage,
    recoverAndResendMessages,
    getTimeZoneByCity,
    sendScheduleMessage,
    updateUserMessageStatus,
    fetchUsersWithUnsentMessages,
    checkAndSendMessages,
    fetchActiveUsers
};